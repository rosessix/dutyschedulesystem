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
];

const WEEKEND_EMPLOYEES = 4
const WEEKDAY_EMPLOYEES = 2

// Returnerer farve baseret på medarbejderens position i sorteret liste
const getUniqueColorForEmployee = (employeeId, employees) => {
  // Sortér medarbejdere efter id for konsistent rækkefølge
  const sortedEmployees = employees.slice().sort((a, b) => a.id.localeCompare(b.id));
  // Find indeks på den aktuelle medarbejder i listen
  const index = sortedEmployees.findIndex(emp => emp.id === employeeId);
  if (index === -1) return "#ccc"; // fallback hvis ikke fundet

  // Returner farve baseret på index (mod farvelængde)
  return COLORS[index % COLORS.length];
};

export default function ShiftScheduler() {
  const [employees, setEmployees] = useState([])
  const [shifts, setShifts] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [newEmployeeName, setNewEmployeeName] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [selectedDates, setSelectedDates] = useState([])

  // Add new employee
  const addEmployee = () => {
    if (newEmployeeName.trim()) {
      const newEmployee = {
        id: Date.now().toString(),
        name: newEmployeeName.trim(),
        preferredDays: [],
        workloadPreference: "normal",
        timeOffRequests: [],
      }
      setEmployees([...employees, newEmployee])
      setNewEmployeeName("")
    }
  }

  // Remove employee
  const removeEmployee = (id) => {
    setEmployees(employees.filter((emp) => emp.id !== id))
    setShifts(shifts.filter((shift) => shift.employeeId !== id))
  }

  // Update employee preferred days
  const updatePreferredDays = (employeeId, day, checked) => {
    setEmployees(
      employees.map((emp) => {
        if (emp.id === employeeId) {
          const newDays = checked ? [...emp.preferredDays, day] : emp.preferredDays.filter((d) => d !== day)
          return { ...emp, preferredDays: newDays }
        }
        return emp
      }),
    )
  }

  // Update workload preference
  const updateWorkloadPreference = (employeeId, preference) => {
    setEmployees(employees.map((emp) => (emp.id === employeeId ? { ...emp, workloadPreference: preference } : emp)))
  }

  // Add time off request
  const addTimeOffRequest = () => {
    if (selectedEmployee && selectedDates.length > 0) {
      setEmployees(
        employees.map((emp) => {
          if (emp.id === selectedEmployee) {
            const newTimeOff = [...emp.timeOffRequests, ...selectedDates]
            return { ...emp, timeOffRequests: newTimeOff }
          }
          return emp
        }),
      )
      setSelectedDates([])
      setSelectedEmployee("")
    }
  }

  // Remove time off request
  const removeTimeOffRequest = (employeeId, date) => {
    setEmployees(
      employees.map((emp) => {
        if (emp.id === employeeId) {
          return {
            ...emp,
            timeOffRequests: emp.timeOffRequests.filter((d) => d.getTime() !== date.getTime()),
          }
        }
        return emp
      }),
    )
  }

  const addEmployeeToShift = (date, employeeId) => {
    const employee = employees.find(e => e.id === employeeId)
    if (!employee) return

    setShifts(prev => {
      const existingShift = prev.find(s => s.date.getTime() === date.getTime())
      if (existingShift) {
        if (existingShift.employees.some(e => e.id === employeeId)) return prev // already added

        return prev.map(s => {
          if (s.date.getTime() === date.getTime()) {
            return { ...s, employees: [...s.employees, { id: employee.id, name: employee.name }] }
          }
          return s
        })
      } else {
        return [...prev, { date, employees: [{ id: employee.id, name: employee.name }] }]
      }
    })
  }

  const removeEmployeeFromShift = (date, employeeId) => {
    setShifts(prev => {
      return prev.map(s => {
        if (s.date.getTime() === date.getTime()) {
          const updatedEmployees = s.employees.filter(e => e.id !== employeeId)
          return { ...s, employees: updatedEmployees }
        }
        return s
      }).filter(s => s.employees.length > 0) // fjern skiftet helt hvis der ikke er nogen medarbejdere tilbage
    })
  }

  // Generate shifts for the month
  const generateShifts = () => {
    const monthStart = startOfMonth(currentMonth) // fx 1. juli
    const monthEnd = endOfMonth(currentMonth)     // fx 31. juli
    
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // mandag
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })       // søndag

    const daysInMonth = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    const newShifts = []

    daysInMonth.forEach((date) => {
      // Determine how many employees needed (2 for weekdays, 4 for weekends)
      // getDay(): 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
      // Weekend: Friday (5), Saturday (6), Sunday (0)
      if (date.getMonth() !== monthStart.getMonth()) return;
      const dayOfWeek = getDay(date)
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
      const employeesNeeded = isWeekend ? WEEKEND_EMPLOYEES : WEEKDAY_EMPLOYEES

      // For preferred days, we need to convert to our display order (Mon=0, Tue=1, ..., Sun=6)
      const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1

      // Find employees who are available (not on time off)
      const availableEmployees = employees.filter((emp) => {
        const isAvailable = !emp.timeOffRequests.some((timeOff) => timeOff.getTime() === date.getTime())
        return isAvailable
      })

      if (availableEmployees.length === 0) return

      const assignedEmployees = []

      // First, try to assign employees who prefer this day
      const preferredEmployees = availableEmployees.filter((emp) => emp.preferredDays.includes(adjustedDayOfWeek))

      // Add preferred employees first (up to the limit nee<ded)
      preferredEmployees.slice(0, employeesNeeded).forEach((emp) => {
        assignedEmployees.push({ id: emp.id, name: emp.name })
      })

      // If we still need more employees, assign based on workload preference and current shift count
      if (assignedEmployees.length < employeesNeeded) {
        const remainingEmployees = availableEmployees.filter(
          (emp) => !assignedEmployees.some((assigned) => assigned.id === emp.id),
        )

        // Count current shifts for each remaining employee this month
        const employeeShiftCounts = remainingEmployees.map((emp) => ({
          employee: emp,
          shiftCount: newShifts.reduce((count, shift) => {
            return count + (shift.employees.some((e) => e.id === emp.id) ? 1 : 0)
          }, 0),
        }))

        // Sort by workload preference and shift count
        employeeShiftCounts.sort((a, b) => {
          // High workload preference gets priority
          if (a.employee.workloadPreference === "high" && b.employee.workloadPreference !== "high") return -1
          if (b.employee.workloadPreference === "high" && a.employee.workloadPreference !== "high") return 1

          // Low workload preference gets lower priority
          if (a.employee.workloadPreference === "low" && b.employee.workloadPreference !== "low") return 1
          if (b.employee.workloadPreference === "low" && a.employee.workloadPreference !== "low") return -1

          // Then sort by current shift count (ascending)
          return a.shiftCount - b.shiftCount
        })

        // Add remaining employees needed
        const stillNeeded = employeesNeeded - assignedEmployees.length
        employeeShiftCounts.slice(0, stillNeeded).forEach(({ employee }) => {
          assignedEmployees.push({ id: employee.id, name: employee.name })
        })
      }

      if (assignedEmployees.length > 0) {
        newShifts.push({
          date,
          employees: assignedEmployees,
        })
      }
    })

    setShifts(newShifts)
  }

  // Get shifts for a specific date
  const getShiftForDate = (date) => {
    return shifts.find((shift) => shift.date.getTime() === date.getTime())
  }

  // Calendar component for displaying shifts
  const ShiftCalendar = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // mandag
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })       // søndag
    const daysInMonth = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <div key={day} className="p-2 text-center font-semibold text-sm">
            {day.slice(0, 3)}
          </div>
        ))}
        {daysInMonth.map((date) => {
          const shift = getShiftForDate(date)
          const hasTimeOff = employees.some((emp) =>
            emp.timeOffRequests.some((timeOff) => timeOff.getTime() === date.getTime()),
          )
          const dayOfWeek = getDay(date)
          // Weekend: Friday (5), Saturday (6), Sunday (0)
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
          const isOutsideMonth = date.getMonth() !== currentMonth.getMonth()
          return (
            <div key={date.getTime()} className={`min-h-[120px] p-2 border rounded-lg ${isOutsideMonth ? "bg-muted text-muted-foreground" : ""}`}>
              <div className="text-sm font-medium mb-1">
                {format(date, "d")}
                <span className="text-xs text-muted-foreground ml-1">({isWeekend ? "4" : "2"})</span>
              </div>
              {shift && (
                <div className="space-y-1">
                  {shift.employees.map((employee, index) => {
                    const dayOfWeek = getDay(shift.date);
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

                    return (
                      <Badge
                        key={employee.id}
                        variant="default"
                        className="text-sm w-full text-black flex justify-between"
                        style={{ backgroundColor: getUniqueColorForEmployee(employee.id, employees) }}
                      >
                        {isWeekend && index === 0 ? `${employee.name} - 16` : employee.name}
                        <Button variant="transparent" size='sm' className={'group hover:bg-slate-700 hover:text-red-700 cursor-pointer transition-all'} onClick={() => removeEmployeeFromShift(date, employee.id)}>
                          <Trash2 className="w-12 h-12 group-hover:scale-125" />
                        </Button>
                      </Badge>
                    )
                  })}

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
            </div>
          )
          {/* + button to add employee */}
        })}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-8xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Vagtplanlægning</h1>
        <p className="text-muted-foreground">Administrer medarbejdere, fridage og generer vagtplaner</p>
      </div>

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Medarbejdere
          </TabsTrigger>
          <TabsTrigger value="timeoff" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Fridage
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <CalendarIconLucide className="w-4 h-4" />
            Vagtplan
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tilføj Medarbejder</CardTitle>
                <CardDescription>Tilføj nye medarbejdere til vagtplanen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Medarbejder navn"
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEmployee()}
                  />
                  <Button onClick={addEmployee}>
                    <Plus className="w-4 h-4 mr-2" />
                    Tilføj
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {employees.map((employee) => (
                <Card key={employee.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{employee.name}</CardTitle>
                      <Button variant="destructive" size="sm" onClick={() => removeEmployee(employee.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Foretrukne dage</Label>
                      <div className="grid grid-cols-7 gap-2 mt-2">
                        {weekDays.map((day, index) => (
                          <div key={day} className="flex items-center space-x-2">
                            <Switch
                              id={`${employee.id}-${index}`}
                              checked={employee.preferredDays.includes(index)}
                              onCheckedChange={(checked) => updatePreferredDays(employee.id, index, checked)}
                            />
                            <Label htmlFor={`${employee.id}-${index}`} className="text-xs">
                              {day.slice(0, 3)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Arbejdsmængde præference</Label>
                      <Select
                        value={employee.workloadPreference}
                        onValueChange={(value) =>
                          updateWorkloadPreference(employee.id, value)
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Lav (færre vagter)</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">Høj (flere vagter)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeoff">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Anmod om Fridage</CardTitle>
                <CardDescription>Vælg medarbejder og datoer for fridage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Medarbejder</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vælg medarbejder" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Fridage</Label>
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates || [])}
                    className="rounded-md border mt-2"
                    locale={da}
                  />
                </div>

                <Button onClick={addTimeOffRequest} disabled={!selectedEmployee || selectedDates.length === 0}>
                  Tilføj Fridage
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {employees.map(
                (employee) =>
                  employee.timeOffRequests.length > 0 && (
                    <Card key={employee.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{employee.name} - Fridage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {employee.timeOffRequests.map((date, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              {format(date, "dd/MM/yyyy", { locale: da })}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => removeTimeOffRequest(employee.id, date)}
                              >
                                ×
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ),
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Vagtplan for {format(currentMonth, "MMMM yyyy", { locale: da })}</CardTitle>
                    <CardDescription>
                      Generer og se vagtplanen for måneden (2 på hverdage, 4 i weekender inkl. fredag)
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                      ← Forrige
                    </Button>
                    <Button variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                      Næste →
                    </Button>
                    <Button onClick={generateShifts}>Generer Vagtplan</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ShiftCalendar />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Systemindstillinger</CardTitle>
              <CardDescription>Konfigurer vagtplanlægningssystemet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <h3 className="font-medium mb-2">Sådan fungerer systemet:</h3>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Tilføj medarbejdere og deres foretrukne ugedage</li>
                  <li>Indstil arbejdsmængde præferencer (lav/normal/høj)</li>
                  <li>Anmod om fridage for specifikke datoer</li>
                  <li>Generer vagtplan - systemet prioriterer foretrukne dage og arbejdsmængde</li>
                  <li>Medarbejdere med "høj" præference får flere vagter</li>
                  <li>Medarbejdere med "lav" præference får færre vagter</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
