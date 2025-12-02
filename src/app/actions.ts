'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getStorageService } from "@/lib/storage"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { hash } from "bcryptjs"


import { analyzeImageWithGemini } from "@/lib/ocr"

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

        const storage = getStorageService();
        const url = await storage.saveFile(file);

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const data = await analyzeImageWithGemini(buffer, file.type);

        return { success: true, url, data }
    } catch (error: any) {
        return { success: false, error: error.message || "An unexpected error occurred" };
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

    const place = formData.get('place') as string
    const dateStr = formData.get('date') as string
    const currency = formData.get('currency') as string

    const amountBeforeTax = formData.get('amountBeforeTax') ? parseFloat(formData.get('amountBeforeTax') as string) : null
    const taxAmount = formData.get('taxAmount') ? parseFloat(formData.get('taxAmount') as string) : null
    const amountAfterTax = formData.get('amountAfterTax') ? parseFloat(formData.get('amountAfterTax') as string) : null

    const file = formData.get('photo') as File | null
    const existingPhotoUrl = formData.get('photoUrl') as string

    const tagsString = formData.get('tags') as string
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0) : []

    let photoUrl: string | undefined = existingPhotoUrl

    if (!photoUrl && file && file.size > 0) {
        const storage = getStorageService()
        photoUrl = await storage.saveFile(file)
    }

    if (!title) {
        throw new Error("Title is required")
    }

    const tagConnectOrCreate = tags.map(tagName => ({
        where: {
            name_userId: {
                name: tagName,
                userId: session.user.id
            }
        },
        create: {
            name: tagName,
            userId: session.user.id
        }
    }))

    try {
        await prisma.slip.create({
            data: {
                title,
                content,
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

    const place = formData.get('place') as string
    const dateStr = formData.get('date') as string
    const currency = formData.get('currency') as string

    const amountBeforeTax = formData.get('amountBeforeTax') ? parseFloat(formData.get('amountBeforeTax') as string) : null
    const taxAmount = formData.get('taxAmount') ? parseFloat(formData.get('taxAmount') as string) : null
    const amountAfterTax = formData.get('amountAfterTax') ? parseFloat(formData.get('amountAfterTax') as string) : null

    const file = formData.get('photo') as File | null
    const existingUrl = formData.get('photoUrl') as string

    // Tags handling
    const tagsString = formData.get('tags') as string
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0) : []

    let photoUrl: string | undefined = existingUrl

    if (file && file.size > 0) {
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
    const tagConnectOrCreate = tags.map(tagName => ({
        where: {
            name_userId: {
                name: tagName,
                userId: session.user.id
            }
        },
        create: {
            name: tagName,
            userId: session.user.id
        }
    }))

    await prisma.slip.update({
        where: { id },
        data: {
            title,
            content,
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
                set: [],
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

export async function checkForDuplicate(data: { place: string, date: string, amount: number }) {
    const session = await getServerSession(authOptions)
    if (!session) return null

    const { place, date, amount } = data

    const duplicates = await prisma.slip.findMany({
        where: {
            userId: session.user.id,
            amountAfterTax: amount,
            date: new Date(date),
            place: {
                contains: place
            }
        },
        select: {
            id: true,
            title: true,
            date: true,
            amountAfterTax: true
        }
    })

    return duplicates.length > 0 ? duplicates[0] : null
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
            escape(slip.content)
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
