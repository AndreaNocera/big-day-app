import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <h2 className="text-3xl font-serif text-primary mb-4">Pagina non trovata</h2>
            <p className="text-muted-foreground mb-8">La pagina che stai cercando non esiste o è stata spostata.</p>
            <Link href="/">
                <Button variant="outline">Torna alla Home</Button>
            </Link>
        </div>
    )
}
