import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Plus, Trash2, Users, CalendarIcon as CalendarIconLucide, Settings } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns"
import { da } from "date-fns/locale"
import { ShiftDialogue } from "./ShiftDialogue"
import { useMobile } from "@/hooks/useMobile"
const weekDays = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"]

const COLORS = [
    "#C4D7FF",
    "#FFD7C4",
    "#FFA5A5",
    "#FF7777",
    "#A6D0E4",
    "#A1C398",
    "#FDC7FF",
    "#4DA8DA",
    "#AC87C5",
    "#9E9FA5",
    "#FDFFAE",
    "#8294C4"
]

// Returnerer farve baseret på medarbejderens position i sorteret liste
const getUniqueColorForEmployee = (employeeId, employees) => {
    const sortedEmployees = employees.slice().sort((a, b) => a.id.localeCompare(b.id))
    const index = sortedEmployees.findIndex(emp => emp.id === employeeId)
    if (index === -1) return "#ccc"
    return COLORS[index % COLORS.length]
}


const ShiftCalendar = ({ shifts, currentMonth, employees, removeEmployeeFromShift, toggleEveningShift, addEmployeeToShift }) => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const daysInMonth = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    const { isMobile } = useMobile()

    // Get shifts for a specific date
    const getShiftForDate = (date) => {
        return shifts.find((shift) => shift.date.getTime() === date.getTime())
    }

    const renderDayContent = (date) => {
        const shift = getShiftForDate(date)
        const hasTimeOff = employees.some((emp) =>
            emp.timeOffRequests.some((timeOff) => timeOff.getTime() === date.getTime()),
        )
        const dayOfWeek = getDay(date)
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6

        return (
            <>
                <div className="text-sm font-medium mb-1 hidden md:block ">
                    <span className="text-xs text-muted-foreground ml-1">Udbringere - {isWeekend ? "4" : "2"}</span>
                </div>
                {shift && (
                    <div className="space-y-1">
                        {shift.employees
                            .slice()
                            .sort((a, b) => (a.earlyShift === b.earlyShift ? 0 : a.earlyShift ? -1 : 1))
                            .map((employee, index) => (
                                <Badge
                                    key={employee.id}
                                    variant="default"
                                    className="text-sm w-full text-black flex justify-between"
                                    style={{ backgroundColor: getUniqueColorForEmployee(employee.id, employees) }}
                                >
                                    {isWeekend && employee.earlyShift ? `${employee.name} - 16` : employee.name}
                                    <ShiftDialogue
                                        onDelete={() => removeEmployeeFromShift(date, employee.id)}
                                        isEveningShift={employee.earlyShift}
                                        onToggle={() => toggleEveningShift(date, employee.id)}
                                    />
                                </Badge>
                            ))}
                    </div>
                )}
                <Select onValueChange={(empId) => addEmployeeToShift(date, empId)}>
                    <SelectTrigger className="w-full text-xs h-8">
                        <SelectValue placeholder="+ Tilføj" />
                    </SelectTrigger>
                    <SelectContent>
                        {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                                {emp.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </>
        )
    }

    if (isMobile) {
        return (
            <div className="w-full h-full flex flex-col gap-4 p-2">
                {daysInMonth.map((date) => {
                    const isOutsideMonth = date.getMonth() !== currentMonth.getMonth()
                    const dayOfWeek = getDay(date)
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6

                    return (
                        <Card key={date.getTime()} className={`w-full ${isOutsideMonth ? "bg-muted text-muted-foreground" : ""}`}>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    {format(date, "EEEE, d. MMMM", { locale: da }).charAt(0).toUpperCase() + format(date, "EEEE, d. MMMM", { locale: da }).slice(1)}
                                    <span className="text-sm text-muted-foreground ml-2">({isWeekend ? "4" : "2"})</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>{renderDayContent(date)}</CardContent>
                        </Card>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
                <div key={day} className="p-2 text-center font-semibold text-sm">
                    {day.slice(0, 3)}
                </div>
            ))}
            {daysInMonth.map((date) => {
                const isOutsideMonth = date.getMonth() !== currentMonth.getMonth()
                return (
                    <div
                        key={date.getTime()}
                        className={`min-h-[120px] p-2 border rounded-lg ${isOutsideMonth ? "bg-muted text-muted-foreground" : ""}`}
                    >
                        {renderDayContent(date)}
                    </div>
                )
            })}
        </div>
    )
}

export default ShiftCalendar

