import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Edit, Edit2, Trash2 } from "lucide-react"

export function ShiftDialogue({ onDelete, isEveningShift, onToggle }) {
    const [evening, setEvening] = useState(isEveningShift)

    const handleToggle = (checked) => {
        setEvening(checked)
        onToggle?.(checked)
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:bg-slate-700 hover:text-blue-300">
                    <Edit className="w-5 h-5" />
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rediger vagt</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <span>16-vagt</span>
                        <Switch checked={evening} onCheckedChange={handleToggle} />
                    </div>

                    <Button variant="destructive" onClick={onDelete}>
                        Slet vagt
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
