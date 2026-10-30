export interface CategoryGroup {
    group: string
    items: string[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
    {
        group: 'Property, Cleaning & Maintenance',
        items: [
            'Cleaning',
            'Laundry',
            'Maintenance',
            'Plumbing & Electrical',
            'Hardware & Tools',
            'Garden & Pool',
            'Pest Control & Hygiene',
            'Security',
            'Furnishings & Appliances',
        ],
    },
    {
        group: 'Food, Dining & Groceries',
        items: [
            'Groceries',
            'Food',
            'Beverages & Liquor',
        ],
    },
    {
        group: 'Transport, Vehicles & Travel',
        items: [
            'Transport',
            'Fuel',
            'Vehicle Maintenance',
            'Parking & Tolls',
            'Travel',
            'Accommodation',
        ],
    },
    {
        group: 'Utilities & Telecoms',
        items: [
            'Utilities',
            'Internet & Telecoms',
        ],
    },
    {
        group: 'Business, Office & Operations',
        items: [
            'Office Supplies',
            'IT & Electronics',
            'Software & Subscriptions',
            'Postage & Courier',
            'Professional Services',
            'Marketing & Advertising',
        ],
    },
    {
        group: 'Personal, Health & Other',
        items: [
            'Shopping',
            'Health',
            'Personal Care',
            'Entertainment',
            'Education & Training',
            'Gifts & Donations',
            'Insurance & Finance',
            'Other',
        ],
    },
]

export const ALL_CATEGORIES: string[] = CATEGORY_GROUPS.flatMap((g) => g.items)

/**
 * Given a category or group filter value (e.g. "group:Property, Cleaning & Maintenance" or "Laundry"),
 * returns the list of matching tag names.
 */
export function resolveCategoryFilter(categoryParam: string): string[] {
    if (categoryParam.startsWith('group:')) {
        const groupName = categoryParam.slice('group:'.length)
        const found = CATEGORY_GROUPS.find(
            (g) => g.group.toLowerCase() === groupName.toLowerCase()
        )
        return found ? found.items : [groupName]
    }
    return [categoryParam]
}

/**
 * Finds the parent group name for a given category/subcategory tag.
 */
export function getCategoryGroupName(tag: string): string | null {
    const lower = tag.toLowerCase()
    for (const g of CATEGORY_GROUPS) {
        if (g.items.some((item) => item.toLowerCase() === lower)) {
            return g.group
        }
    }
    return null
}
