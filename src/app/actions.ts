'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getStorageService } from "@/lib/storage"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { hash } from "bcryptjs"


import { extractTextFromImage, parseSlipDetails } from "@/lib/ocr"

export async function analyzeSlip(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const file = formData.get('photo') as File | null
    if (!file || file.size === 0) throw new Error("No file provided")

    const storage = getStorageService()
    const url = await storage.saveFile(file)

    // Convert file to buffer for OCR
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log("Starting OCR analysis...");
    const text = await extractTextFromImage(buffer)
    console.log("OCR Text:", text.substring(0, 100) + "...");

    const data = parseSlipDetails(text)
    console.log("Parsed Data:", data);

    return { url, data }
}

export async function createSlip(formData: FormData) {
    const session = await getServerSession(authOptions)

    if (!session) {
        throw new Error("Unauthorized")
    }

    const title = formData.get('title') as string
    const content = formData.get('content') as string // This is now the summary/notes

    // New fields
    const place = formData.get('place') as string
    const dateStr = formData.get('date') as string
    const currency = formData.get('currency') as string

    const amountBeforeTax = formData.get('amountBeforeTax') ? parseFloat(formData.get('amountBeforeTax') as string) : null
    const taxAmount = formData.get('taxAmount') ? parseFloat(formData.get('taxAmount') as string) : null
    const amountAfterTax = formData.get('amountAfterTax') ? parseFloat(formData.get('amountAfterTax') as string) : null

    // Handle file: could be a new upload OR a URL from the analysis step
    const file = formData.get('photo') as File | null
    // const existingUrl = formData.get('photoUrl') as string // Removed as per instruction

    // Tags handling
    const tagsString = formData.get('tags') as string
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0) : []

    let photoUrl: string | undefined = undefined // Changed initialization as per instruction

    if (file && file.size > 0) {
        const storage = getStorageService()
        photoUrl = await storage.saveFile(file)
    }

    if (!title) {
        throw new Error("Title is required")
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

    await prisma.slip.create({
        data: {
            title,
            content,
            place,
            date: dateStr ? new Date(dateStr) : null, // Changed undefined to null
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
            tags: { // Added tags handling
                connectOrCreate: tagConnectOrCreate
            }
        }
    })

    revalidatePath('/dashboard')
    redirect('/dashboard')
}

export async function registerUser(formData: FormData) {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        throw new Error("Email and password are required")
    }

    const existingUser = await prisma.user.findUnique({
        where: { email }
    })

    if (existingUser) {
        throw new Error("User already exists")
    }

    const hashedPassword = await hash(password, 12)

    await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role: 'USER'
        }
    })

    redirect('/login')
}

export async function updateSlip(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

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

    // Verify ownership
    const existingSlip = await prisma.slip.findUnique({
        where: { id },
        include: { photos: true, tags: true }
    })

    if (!existingSlip || existingSlip.userId !== session.user.id) {
        throw new Error("Slip not found or unauthorized")
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
            // Handle photo update if URL changed or new photo added
            photos: photoUrl && (!existingSlip.photos[0] || existingSlip.photos[0].url !== photoUrl) ? {
                deleteMany: {}, // Optional: remove old photo relation
                create: { url: photoUrl }
            } : undefined,
            // Update tags: set allows us to replace existing tags with the new list
            tags: {
                set: [], // Disconnect all existing
                connectOrCreate: tagConnectOrCreate // Connect new ones
            }
        }
    })

    revalidatePath('/dashboard')
    redirect('/dashboard')
}

export async function deleteSlip(id: string) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const slip = await prisma.slip.findUnique({
        where: { id }
    })

    if (!slip || slip.userId !== session.user.id) {
        throw new Error("Slip not found or unauthorized")
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

    // Simple fuzzy match or exact match logic
    // Here we check for exact date and amount, and contains place name
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

    const slips = await prisma.slip.findMany({
        where: { userId: session.user.id },
        orderBy: { date: 'desc' },
        include: { tags: true }
    })

    // CSV Header
    const header = ['Date', 'Title', 'Place', 'Amount', 'Currency', 'Tags', 'Summary'].join(',')

    // CSV Rows
    const rows = slips.map(slip => {
        const date = slip.date ? slip.date.toISOString().split('T')[0] : ''
        const tags = slip.tags.map(t => t.name).join(';')

        // Escape fields that might contain commas
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
