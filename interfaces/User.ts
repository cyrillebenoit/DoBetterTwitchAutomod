interface User {
    userId: string
    username: string
    watching: boolean
    blockedTerms: string[]
    mode: string
    preferences: {
        include: boolean
        leet: boolean
        repeat: boolean
        spaces: boolean
    }
}
