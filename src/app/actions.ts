'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getStorageService } from "@/lib/storage"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { hash } from "bcryptjs"


import { analyzeImageWithGemini, analyzeImageWithGrok } from "@/lib/ocr"
import { saveAndAnalyze } from "@/lib/saveAndAnalyze"
import {
    ANALYSIS_GAVE_UP_MESSAGE,
    PHOTO_SAVE_TIMEOUT_MS,
    withTimeout,
} from "@/lib/analysisLimits"
import {
    buildCanonicalSupplierMap,
    findMatchingExistingSupplier,
    getRawSlipSupplier,
    isSameSupplier,
    namesMatchingSupplier,
    planSupplierRename,
    resolveMergeScope,
    suggestPlaceAsSupplier,
} from "@/lib/suppliers"
import { writeSupplierRenames } from "@/lib/supplierMergeWrite"

function errorMessage(error: unknown): string {
    if (typeof error === "object" && error && "message" in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string" && message) return message;
    }
    return "An unexpected error occurred";
}

export async function analyzeSlip(formData: FormData) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return { success: false, error: "Unauthorized" };
        }

        const file = formData.get('photo') as File | null
        if (!file || file.size === 0) {
            return { success: false, error: "No file provided" };
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        // One read of the upload. Save and analysis both use this copy, so they can run together.
        const uploadFile = new File([buffer], file.name || "receipt.jpg", {
            type: file.type || "image/jpeg",
        })
        const storage = getStorageService();

        const outcome = await saveAndAnalyze({
            save: () => withTimeout(
                storage.saveFile(uploadFile),
                PHOTO_SAVE_TIMEOUT_MS,
                ANALYSIS_GAVE_UP_MESSAGE
            ),
            analyze: async () => {
                let data;
                let usedGrok = false;

                try {
                    data = await analyzeImageWithGemini(buffer, uploadFile.type);
                } catch (geminiError: unknown) {
                    // Gemini has already tried the fallback model. Grok is last, and only if a key exists.
                    console.error("Gemini failed, trying Grok fallback...", geminiError);
                    const grokKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
                    if (grokKey) {
                        try {
                            data = await analyzeImageWithGrok(buffer, uploadFile.type);
                            usedGrok = true;
                        } catch (grokError: unknown) {
                            console.error("Grok fallback also failed:", grokError);
                            const geminiMessage = errorMessage(geminiError);
                            const grokMessage = errorMessage(grokError);
                            throw new Error(`Gemini failed: ${geminiMessage}. Grok fallback failed: ${grokMessage}`);
                        }
                    } else {
                        throw geminiError;
                    }
                }

                return { data, usedGrok };
            },
        });

        if (!outcome.ok) {
            return { success: false, url: outcome.url, error: errorMessage(outcome.error) };
        }

        let duplicate = null;
        let supplierMatch = null;
        let existingSuppliers: string[] = [];
        const extracted = outcome.result.data;

        try {
            existingSuppliers = await getExistingSuppliers();
            if (extracted?.place) {
                supplierMatch = findMatchingExistingSupplier(extracted.place, existingSuppliers);
            }
        } catch (supErr) {
            console.error("Supplier match check failed:", supErr);
        }

        if (extracted?.date && typeof extracted?.amountAfterTax === 'number' && extracted.amountAfterTax > 0) {
            try {
                duplicate = await checkForDuplicate({
                    title: extracted.place || '',
                    place: extracted.place || '',
                    date: extracted.date,
                    amount: extracted.amountAfterTax,
                });
            } catch (dupErr) {
                console.error("Duplicate check during analysis failed:", dupErr);
            }
        }

        return {
            success: true,
            url: outcome.url,
            data: outcome.result.data,
            usedGrok: outcome.result.usedGrok,
            duplicate,
            supplierMatch,
            existingSuppliers,
        }
    } catch (error: unknown) {
        return { success: false, error: errorMessage(error) };
    }
}

export async function createSlip(formData: FormData) {
    const session = await getServerSession(authOptions)

    if (!session) {
        throw new Error("Unauthorized")
    }

    if (session.user.role === 'ACCOUNTANT') {
        throw new Error("Unauthorized: Accountants cannot create slips")
    }

    const title = formData.get('title') as string
    const content = formData.get('content') as string
    const summary = formData.get('summary') as string

    const place = formData.get('place') as string
    const dateStr = formData.get('date') as string
    const currency = formData.get('currency') as string

    const amountBeforeTax = formData.get('amountBeforeTax') ? parseFloat(formData.get('amountBeforeTax') as string) : null
    const taxAmount = formData.get('taxAmount') ? parseFloat(formData.get('taxAmount') as string) : null
    const amountAfterTax = formData.get('amountAfterTax') ? parseFloat(formData.get('amountAfterTax') as string) : null

    const file = formData.get('photo') as File | null
    const existingPhotoUrl = formData.get('photoUrl') as string

    const tag = formData.get('tag') as string

    let photoUrl: string | undefined = existingPhotoUrl

    if (!photoUrl && file && file.size > 0) {
        const storage = getStorageService()
        photoUrl = await storage.saveFile(file)
    }

    if (!title) {
        throw new Error("Title is required")
    }

    const ignoreDuplicate = formData.get('ignoreDuplicate') === 'on'
    let existingDuplicate = null
    if (dateStr && amountAfterTax && amountAfterTax > 0) {
        existingDuplicate = await checkForDuplicate({
            title,
            place,
            date: dateStr,
            amount: amountAfterTax,
        })
        if (existingDuplicate && !ignoreDuplicate) {
            throw new Error(
                `Duplicate slip detected: Matches existing slip "${existingDuplicate.title}". Please tick "Confirm upload anyway" to save.`
            )
        }
    }

    // We only support one tag now, but the schema supports many.
    // We will connect or create the single selected tag.
    const tagConnectOrCreate = tag ? [{
        where: {
            name_userId: {
                name: tag,
                userId: session.user.id
            }
        },
        create: {
            name: tag,
            userId: session.user.id
        }
    }] : []

    try {
        await prisma.slip.create({
            data: {
                title,
                content,
                summary,
                place,
                date: dateStr ? new Date(dateStr) : null,
                amountBeforeTax,
                taxAmount,
                amountAfterTax,
                currency,
                userId: session.user.id,
                photos: photoUrl ? {
                    create: {
                        url: photoUrl
                    }
                } : undefined,
                tags: {
                    connectOrCreate: tagConnectOrCreate
                }
            }
        })
    } catch (error) {
        console.error("Failed to create slip:", error)
        throw new Error(error instanceof Error ? error.message : "Failed to create slip")
    }

    // Check for duplicates and notify admins
    if (session.user.companyId && dateStr && amountAfterTax) {
        try {
            const duplicates = await prisma.slip.findMany({
                where: {
                    user: { companyId: session.user.companyId },
                    amountAfterTax: amountAfterTax,
                    date: new Date(dateStr),
                    place: { contains: place },
                    NOT: { userId: session.user.id } // Don't count self as duplicate of self (though we just created it, so we exclude the current user's slips to find *other* people's duplicates)
                },
                include: { user: true }
            })

            if (duplicates.length > 0) {
                // Find admins and accountants
                const admins = await prisma.user.findMany({
                    where: {
                        companyId: session.user.companyId,
                        role: { in: ['COMPANY_ADMIN', 'ACCOUNTANT', 'ADMIN'] }
                    }
                })

                const duplicate = duplicates[0]
                const message = `Possible duplicate slip uploaded by ${session.user.name}. Matches slip "${duplicate.title}" by ${duplicate.user.name || duplicate.user.email}.`

                for (const admin of admins) {
                    await prisma.notification.create({
                        data: {
                            userId: admin.id,
                            title: "Duplicate Slip Detected",
                            message: message,
                            type: "DUPLICATE_WARNING",
                            link: `/dashboard/slips?q=${encodeURIComponent(place)}` // Link to search for the place
                        }
                    })
                }
            }
        } catch (error) {
            console.error("Failed to process duplicate notifications:", error)
            // Don't fail the request if notifications fail
        }
    }

    revalidatePath('/dashboard')
    redirect('/dashboard')
}

export async function registerUser(formData: FormData) {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const companyName = formData.get('companyName') as string

    if (!email || !password) {
        return { success: false, error: "Email and password are required" }
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return { success: false, error: "User already exists" }
        }

        const hashedPassword = await hash(password, 12)

        let companyId = null;
        let role = 'USER';

        if (companyName) {
            const company = await prisma.company.create({
                data: { name: companyName }
            })
            companyId = company.id
            role = 'COMPANY_ADMIN'
        }

        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                companyName,
                companyId,
                role: role as any
            }
        })

        return { success: true }
    } catch (error) {
        console.error("Registration error:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Something went wrong during registration"
        }
    }
}

export async function updateUser(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const name = formData.get('name') as string
    const companyName = formData.get('companyName') as string

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name,
                companyName
            }
        })

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Update user error:", error)
        return { success: false, error: "Failed to update profile" }
    }
}

export async function updateSlip(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    if (session.user.role === 'ACCOUNTANT') {
        throw new Error("Unauthorized: Accountants cannot update slips")
    }

    const id = formData.get('id') as string
    if (!id) throw new Error("Slip ID is required")

    const title = formData.get('title') as string
    const content = formData.get('content') as string
    const summary = formData.get('summary') as string

    const place = formData.get('place') as string
    const dateStr = formData.get('date') as string
    const currency = formData.get('currency') as string

    const amountBeforeTax = formData.get('amountBeforeTax') ? parseFloat(formData.get('amountBeforeTax') as string) : null
    const taxAmount = formData.get('taxAmount') ? parseFloat(formData.get('taxAmount') as string) : null
    const amountAfterTax = formData.get('amountAfterTax') ? parseFloat(formData.get('amountAfterTax') as string) : null

    const file = formData.get('photo') as File | null
    const existingUrl = formData.get('photoUrl') as string

    // Tags handling
    const tag = formData.get('tag') as string

    let photoUrl: string | undefined = existingUrl

    if (!photoUrl && file && file.size > 0) {
        const storage = getStorageService()
        photoUrl = await storage.saveFile(file)
    }

    if (!title) throw new Error("Title is required")

    // Verify ownership or admin access
    const existingSlip = await prisma.slip.findUnique({
        where: { id },
        include: { photos: true, tags: true, user: true }
    })

    if (!existingSlip) {
        throw new Error("Slip not found")
    }

    const isCompanyAdmin = (session.user.role === 'COMPANY_ADMIN' || session.user.role === 'ADMIN') && session.user.companyId
    const isOwner = existingSlip.userId === session.user.id
    const isSameCompany = existingSlip.user.companyId === session.user.companyId

    if (!isOwner && !(isCompanyAdmin && isSameCompany)) {
        throw new Error("Unauthorized")
    }

    // Handle Tags: Connect or Create
    const tagConnectOrCreate = tag ? [{
        where: {
            name_userId: {
                name: tag,
                userId: session.user.id
            }
        },
        create: {
            name: tag,
            userId: session.user.id
        }
    }] : []

    await prisma.slip.update({
        where: { id },
        data: {
            title,
            content,
            summary,
            place,
            date: dateStr ? new Date(dateStr) : null,
            amountBeforeTax,
            taxAmount,
            amountAfterTax,
            currency,
            photos: photoUrl && (!existingSlip.photos[0] || existingSlip.photos[0].url !== photoUrl) ? {
                deleteMany: {},
                create: { url: photoUrl }
            } : undefined,
            tags: {
                set: [], // Clear existing tags to enforce single tag
                connectOrCreate: tagConnectOrCreate
            }
        }
    })

    revalidatePath('/dashboard')
    redirect('/dashboard')
}

export async function deleteSlip(id: string) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    if (session.user.role === 'ACCOUNTANT') {
        throw new Error("Unauthorized: Accountants cannot delete slips")
    }

    const slip = await prisma.slip.findUnique({
        where: { id },
        include: { user: true }
    })

    if (!slip) {
        throw new Error("Slip not found")
    }

    const isCompanyAdmin = (session.user.role === 'COMPANY_ADMIN' || session.user.role === 'ADMIN') && session.user.companyId
    const isOwner = slip.userId === session.user.id
    const isSameCompany = slip.user.companyId === session.user.companyId

    if (!isOwner && !(isCompanyAdmin && isSameCompany)) {
        throw new Error("Unauthorized")
    }

    await prisma.slip.delete({
        where: { id }
    })

    revalidatePath('/dashboard')
    redirect('/dashboard')
}

export async function checkForDuplicate(data: {
    title?: string
    place?: string
    date: string
    amount: number
    excludeId?: string
}) {
    const session = await getServerSession(authOptions)
    if (!session) return null

    const { title, place, date, amount, excludeId } = data
    if (!date || typeof amount !== 'number' || isNaN(amount) || amount <= 0) return null

    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) return null

    // Match across the entire calendar day (UTC) so timezone offsets or time parts never break matching
    const dateKey = parsedDate.toISOString().split('T')[0]
    const startOfDay = new Date(`${dateKey}T00:00:00.000Z`)
    const endOfDay = new Date(`${dateKey}T23:59:59.999Z`)

    const companyId = session.user.companyId
    const baseWhere: any = companyId
        ? { user: { companyId } }
        : { userId: session.user.id }

    if (excludeId) {
        baseWhere.id = { not: excludeId }
    }

    const candidates = await prisma.slip.findMany({
        where: {
            ...baseWhere,
            date: {
                gte: startOfDay,
                lte: endOfDay,
            },
            amountAfterTax: {
                gte: amount - 0.01,
                lte: amount + 0.01,
            },
        },
        select: {
            id: true,
            title: true,
            place: true,
            date: true,
            amountAfterTax: true,
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    })

    if (candidates.length === 0) return null

    // Prioritize candidate whose title or place shares words/substrings with input title/place
    const searchTerms = [title, place]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3)

    if (searchTerms.length > 0) {
        const bestMatch = candidates.find((c) => {
            const target = `${c.title || ''} ${c.place || ''}`.toLowerCase()
            return searchTerms.some((term) => target.includes(term))
        })
        if (bestMatch) return bestMatch
    }

    // Same calendar day and exact same amount is still flagged as a duplicate candidate
    return candidates[0]
}

export async function exportSlips() {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const isCompanyView = (session.user.role === 'COMPANY_ADMIN' || session.user.role === 'ACCOUNTANT' || session.user.role === 'ADMIN') && session.user.companyId

    const whereClause = isCompanyView
        ? { user: { companyId: session.user.companyId } }
        : { userId: session.user.id }

    const slips = await prisma.slip.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        include: { tags: true }
    })

    const header = ['Date', 'Title', 'Place', 'Amount', 'Currency', 'Tags', 'Summary'].join(',')

    const rows = slips.map((slip: any) => {
        const date = slip.date ? slip.date.toISOString().split('T')[0] : ''
        const tags = slip.tags.map((t: any) => t.name).join(';')

        const escape = (field: string | null | undefined) => {
            if (!field) return ''
            return `"${field.replace(/"/g, '""')}"`
        }

        return [
            date,
            escape(slip.title),
            escape(slip.place),
            slip.amountAfterTax || 0,
            slip.currency || '',
            escape(tags),
            escape(slip.summary || slip.content)
        ].join(',')
    })

    return [header, ...rows].join('\n')
}

export async function inviteUser(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const isCompanyAdmin = (session.user.role === 'COMPANY_ADMIN' || session.user.role === 'ADMIN') && session.user.companyId

    if (!isCompanyAdmin) {
        throw new Error("Unauthorized: Only company admins can invite users")
    }

    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const role = formData.get('role') as string

    if (!email || !name || !role) {
        return { success: false, error: "Name, email, and role are required" }
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return { success: false, error: "User already exists" }
        }

        // Default password for invited users
        const hashedPassword = await hash("password123", 12)

        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                companyId: session.user.companyId,
                role: role as any
            }
        })

        revalidatePath('/dashboard/settings')
        return { success: true }
    } catch (error) {
        console.error("Invite user error:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Something went wrong during invitation"
        }
    }
}

export async function leaveCompany() {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    if (!session.user.companyId) {
        return { success: false, error: "You are not part of a company" }
    }

    try {
        // If the user is the last admin, we might want to warn them or prevent it, 
        // but for now, we'll just allow it. The company might become orphaned if no other admins exist.
        // A more robust system would check for this.

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                companyId: null,
                role: 'USER' // Reset to default user role
            }
        })

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Leave company error:", error)
        return {
            success: false,
            error: "Failed to leave company"
        }
    }
}

export async function resetPassword(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!password || !confirmPassword) {
        return { success: false, error: "Password and confirm password are required" }
    }

    if (password !== confirmPassword) {
        return { success: false, error: "Passwords do not match" }
    }

    if (password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters" }
    }

    try {
        const hashedPassword = await hash(password, 12)

        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: hashedPassword }
        })

        return { success: true }
    } catch (error) {
        console.error("Reset password error:", error)
        return { success: false, error: "Failed to reset password" }
    }
}

export async function removeUserFromCompany(userId: string) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const isCompanyAdmin = (session.user.role === 'COMPANY_ADMIN' || session.user.role === 'ADMIN') && session.user.companyId

    if (!isCompanyAdmin) {
        throw new Error("Unauthorized: Only company admins can remove users")
    }

    if (userId === session.user.id) {
        return { success: false, error: "You cannot remove yourself" }
    }

    try {
        const userToRemove = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!userToRemove || userToRemove.companyId !== session.user.companyId) {
            return { success: false, error: "User not found in your company" }
        }

        // Transfer all slips to the admin (current user)
        await prisma.slip.updateMany({
            where: { userId: userId },
            data: { userId: session.user.id }
        })

        // Remove user from company and reset role
        await prisma.user.update({
            where: { id: userId },
            data: {
                companyId: null,
                companyName: null,
                role: 'USER'
            }
        })

        revalidatePath('/dashboard/settings')
        revalidatePath('/dashboard/preferences')
        return { success: true }
    } catch (error) {
        console.error("Remove user error:", error)
        return { success: false, error: "Failed to remove user" }
    }
}

export async function getNotifications() {
    const session = await getServerSession(authOptions)
    if (!session) return []

    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' }
        })
        return notifications
    } catch (error) {
        console.error("Get notifications error:", error)
        return []
    }
}

export async function markNotificationAsRead(id: string) {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false }

    try {
        await prisma.notification.update({
            where: { id, userId: session.user.id },
            data: { read: true }
        })
        revalidatePath('/dashboard/notifications')
        return { success: true }
    } catch (error) {
        return { success: false }
    }
}

export async function clearAllNotifications() {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false }

    try {
        await prisma.notification.updateMany({
            where: { userId: session.user.id, read: false },
            data: { read: true }
        })
        revalidatePath('/dashboard/notifications')
        return { success: true }
    } catch (error) {
        return { success: false }
    }
}
export async function deleteNotification(id: string) {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false }

    try {
        await prisma.notification.delete({
            where: { id, userId: session.user.id }
        })
        revalidatePath('/dashboard/notifications')
        return { success: true }
    } catch (error) {
        return { success: false }
    }
}

export async function getExistingSuppliers(): Promise<string[]> {
    const session = await getServerSession(authOptions)
    if (!session) return []

    const isCompanyView =
        (session.user.role === 'COMPANY_ADMIN' ||
            session.user.role === 'ACCOUNTANT' ||
            session.user.role === 'ADMIN') &&
        session.user.companyId

    const whereClause = isCompanyView
        ? { user: { companyId: session.user.companyId } }
        : { userId: session.user.id }

    try {
        const rows = await prisma.slip.findMany({
            where: whereClause,
            select: { title: true, place: true },
        })

        const rawNames = rows
            .map((r) => getRawSlipSupplier(r))
            .filter((name) => name && name !== 'Unspecified Supplier' && !name.startsWith('TEST_'))

        const canonicalMap = buildCanonicalSupplierMap(rawNames)
        const uniqueCanonicals = Array.from(new Set(canonicalMap.values())).sort((a, b) =>
            a.localeCompare(b)
        )
        return uniqueCanonicals
    } catch (error) {
        console.error("Failed to fetch existing suppliers:", error)
        return []
    }
}

const MAX_MERGE_NAMES = 40
const MAX_MERGE_NAME_LENGTH = 120

export interface SupplierMergePreviewSlip {
    id: string
    beforeTitle: string
    beforePlace: string | null
    afterTitle: string
    afterPlace: string | null
}

export interface SupplierMergeResult {
    success: boolean
    error?: string
    cleanName: string
    slips: SupplierMergePreviewSlip[]
    rejectedNames: string[]
    updatedCount: number
}

function readMergeRequest(input: {
    variantNames?: string[]
    cleanName?: string
    includeCompanyMembers?: boolean
}): { error: string } | { cleanName: string; variantNames: string[]; includeCompanyMembers: boolean } {
    const cleanName = (input.cleanName || '').trim()
    const variantNames = Array.isArray(input.variantNames)
        ? input.variantNames.map((name) => (name || '').trim()).filter(Boolean)
        : []

    if (!cleanName || cleanName.length > MAX_MERGE_NAME_LENGTH) {
        return { error: 'Enter a clean supplier name.' }
    }
    if (variantNames.length === 0 || variantNames.length > MAX_MERGE_NAMES) {
        return { error: 'Choose the supplier names to review.' }
    }
    if (variantNames.some((name) => name.length > MAX_MERGE_NAME_LENGTH)) {
        return { error: 'One of those supplier names is too long.' }
    }

    return {
        cleanName,
        variantNames,
        includeCompanyMembers: input.includeCompanyMembers === true,
    }
}

async function loadSupplierMergePlan(input: {
    variantNames: string[]
    cleanName: string
    includeCompanyMembers: boolean
}): Promise<
    | { error: string; rejectedNames: string[] }
    | { slips: SupplierMergePreviewSlip[]; rejectedNames: string[] }
> {
    const session = await getServerSession(authOptions)
    if (!session) return { error: 'Unauthorized', rejectedNames: [] }

    const scope = resolveMergeScope({
        role: session.user.role,
        userId: session.user.id,
        companyId: session.user.companyId,
        includeCompanyMembers: input.includeCompanyMembers,
    })
    if (scope.kind === 'forbidden') {
        return { error: scope.reason, rejectedNames: [] }
    }

    const { accepted, rejected } = namesMatchingSupplier(input.variantNames, input.cleanName)
    if (accepted.length === 0) {
        return {
            error: `None of those names match “${input.cleanName}”.`,
            rejectedNames: rejected,
        }
    }

    const scopeWhere =
        scope.kind === 'company'
            ? { user: { companyId: scope.companyId } }
            : { userId: scope.userId }

    const rows = await prisma.slip.findMany({
        where: {
            ...scopeWhere,
            OR: accepted.map((name) => ({
                title: { equals: name, mode: 'insensitive' as const },
            })),
        },
        select: { id: true, title: true, place: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })

    const slips: SupplierMergePreviewSlip[] = []
    for (const row of rows) {
        const title = (row.title || '').trim()
        if (
            title.toLowerCase() !== input.cleanName.toLowerCase() &&
            !isSameSupplier(title, input.cleanName)
        ) {
            continue
        }
        const planned = planSupplierRename(row, input.cleanName)
        if (!planned.changed) continue
        slips.push({
            id: row.id,
            beforeTitle: row.title,
            beforePlace: row.place,
            afterTitle: planned.title,
            afterPlace: planned.place,
        })
    }

    return { slips, rejectedNames: rejected }
}

export async function previewSupplierMerge(input: {
    variantNames: string[]
    cleanName: string
    includeCompanyMembers?: boolean
}): Promise<SupplierMergeResult> {
    const request = readMergeRequest(input)
    if ('error' in request) {
        return { success: false, error: request.error, cleanName: '', slips: [], rejectedNames: [], updatedCount: 0 }
    }

    try {
        const plan = await loadSupplierMergePlan(request)
        if ('error' in plan) {
            return {
                success: false,
                error: plan.error,
                cleanName: request.cleanName,
                slips: [],
                rejectedNames: plan.rejectedNames,
                updatedCount: 0,
            }
        }
        if (plan.slips.length === 0) {
            return {
                success: true,
                error: 'No slips you can edit would change. Company admins can include other members only by choosing that option.',
                cleanName: request.cleanName,
                slips: [],
                rejectedNames: plan.rejectedNames,
                updatedCount: 0,
            }
        }
        return {
            success: true,
            cleanName: request.cleanName,
            slips: plan.slips,
            rejectedNames: plan.rejectedNames,
            updatedCount: 0,
        }
    } catch (error) {
        console.error('Failed to preview supplier merge:', error)
        return {
            success: false,
            error: 'Could not preview those supplier names.',
            cleanName: request.cleanName,
            slips: [],
            rejectedNames: [],
            updatedCount: 0,
        }
    }
}

export async function confirmSupplierMerge(input: {
    variantNames: string[]
    cleanName: string
    includeCompanyMembers?: boolean
}): Promise<SupplierMergeResult> {
    const request = readMergeRequest(input)
    if ('error' in request) {
        return { success: false, error: request.error, cleanName: '', slips: [], rejectedNames: [], updatedCount: 0 }
    }

    try {
        const plan = await loadSupplierMergePlan(request)
        if ('error' in plan) {
            return {
                success: false,
                error: plan.error,
                cleanName: request.cleanName,
                slips: [],
                rejectedNames: plan.rejectedNames,
                updatedCount: 0,
            }
        }
        if (plan.slips.length === 0) {
            return {
                success: false,
                error: 'Nothing to update.',
                cleanName: request.cleanName,
                slips: [],
                rejectedNames: plan.rejectedNames,
                updatedCount: 0,
            }
        }

        const updatedCount = await prisma.$transaction((tx) =>
            writeSupplierRenames(
                tx,
                plan.slips.map((slip) => ({
                    id: slip.id,
                    title: slip.afterTitle,
                    place: slip.afterPlace,
                }))
            )
        )

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/suppliers')
        revalidatePath('/dashboard/suppliers/review')
        revalidatePath('/dashboard/slips')
        return {
            success: true,
            cleanName: request.cleanName,
            slips: plan.slips,
            rejectedNames: plan.rejectedNames,
            updatedCount,
        }
    } catch (error) {
        console.error('Failed to confirm supplier merge:', error)
        return {
            success: false,
            error: 'Could not update those slips. Nothing was saved.',
            cleanName: request.cleanName,
            slips: [],
            rejectedNames: [],
            updatedCount: 0,
        }
    }
}

export interface PlaceSupplierPreview {
    id: string
    beforeTitle: string
    beforePlace: string | null
    afterTitle: string
    afterPlace: string | null
}

async function loadPlaceSuggestion(
    slipId: string,
    includeCompanyMembers: boolean
): Promise<{ error: string } | { slip: PlaceSupplierPreview }> {
    const session = await getServerSession(authOptions)
    if (!session) return { error: 'Unauthorized' }
    if (!slipId || slipId.length > 80) return { error: 'Slip not found' }

    const scope = resolveMergeScope({
        role: session.user.role,
        userId: session.user.id,
        companyId: session.user.companyId,
        includeCompanyMembers,
    })
    if (scope.kind === 'forbidden') return { error: scope.reason }

    const scopeWhere =
        scope.kind === 'company'
            ? { user: { companyId: scope.companyId } }
            : { userId: scope.userId }

    const slip = await prisma.slip.findFirst({
        where: { id: slipId, ...scopeWhere },
        select: { id: true, title: true, place: true },
    })
    if (!slip) return { error: 'Slip not found' }

    const suggested = suggestPlaceAsSupplier(slip)
    if (!suggested) {
        return { error: 'Place is not a better supplier name for this slip.' }
    }

    return {
        slip: {
            id: slip.id,
            beforeTitle: slip.title,
            beforePlace: slip.place,
            afterTitle: suggested,
            afterPlace: slip.place,
        },
    }
}

export async function previewPlaceAsSupplier(input: {
    slipId: string
    includeCompanyMembers?: boolean
}): Promise<{ success: boolean; error?: string; slip: PlaceSupplierPreview | null }> {
    try {
        const loaded = await loadPlaceSuggestion(input.slipId, input.includeCompanyMembers === true)
        if ('error' in loaded) return { success: false, error: loaded.error, slip: null }
        return { success: true, slip: loaded.slip }
    } catch (error) {
        console.error('Failed to preview place supplier:', error)
        return { success: false, error: 'Could not preview that slip.', slip: null }
    }
}

export async function confirmPlaceAsSupplier(input: {
    slipId: string
    includeCompanyMembers?: boolean
}): Promise<{ success: boolean; error?: string; updatedCount: number }> {
    try {
        const loaded = await loadPlaceSuggestion(input.slipId, input.includeCompanyMembers === true)
        if ('error' in loaded) return { success: false, error: loaded.error, updatedCount: 0 }

        await prisma.$transaction((tx) =>
            writeSupplierRenames(tx, [
                {
                    id: loaded.slip.id,
                    title: loaded.slip.afterTitle,
                    place: loaded.slip.afterPlace,
                },
            ])
        )

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/suppliers')
        revalidatePath('/dashboard/suppliers/review')
        revalidatePath('/dashboard/slips')
        return { success: true, updatedCount: 1 }
    } catch (error) {
        console.error('Failed to confirm place supplier:', error)
        return { success: false, error: 'Could not update that slip. Nothing was saved.', updatedCount: 0 }
    }
}
