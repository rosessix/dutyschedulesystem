import { useEffect, useState } from "react"

export function useMobile() {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768) // Tailwind's 'md' breakpoint is 768px
        }

        checkMobile() // Check on mount
        window.addEventListener("resize", checkMobile) // Add event listener for resize

        return () => {
            window.removeEventListener("resize", checkMobile) // Clean up on unmount
        }
    }, [])

    return { isMobile }
}
