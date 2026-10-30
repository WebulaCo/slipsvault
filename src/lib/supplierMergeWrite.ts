export interface SupplierRenameWrite {
    id: string
    title: string
    place: string | null
}

interface RenameWriter {
    slip: {
        update: (args: {
            where: { id: string }
            data: { title: string; place: string | null }
        }) => Promise<unknown>
    }
}

/** Apply every planned rename on the same transaction client. */
export async function writeSupplierRenames(
    tx: RenameWriter,
    plans: SupplierRenameWrite[]
): Promise<number> {
    for (const plan of plans) {
        await tx.slip.update({
            where: { id: plan.id },
            data: {
                title: plan.title,
                place: plan.place,
            },
        })
    }
    return plans.length
}
