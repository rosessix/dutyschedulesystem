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
import { ShiftDialogue } from "./components/ShiftDialogue"
import ShiftCalendar from "./components/ShiftCalendar"

const weekDays = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"]
const WEEKEND_EMPLOYEES = 4
const WEEKDAY_EMPLOYEES = 2

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
        maxShiftsPerMonth: 15,
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

    const dayOfWeek = getDay(date)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6

    setShifts(prev => {
      const existingShift = prev.find(s => s.date.getTime() === date.getTime())
      if (existingShift) {
        if (existingShift.employees.some(e => e.id === employeeId)) return prev // already added

        // Tjek om der allerede er en earlyShift tildelt for denne dag
        const hasEarlyShift = isWeekend && existingShift.employees.some(e => e.earlyShift)

        return prev.map(s => {
          if (s.date.getTime() === date.getTime()) {
            return {
              ...s,
              employees: [...s.employees, { id: employee.id, name: employee.name, earlyShift: isWeekend && !hasEarlyShift }]
            }
          }
          return s
        })
      } else {
        return [...prev, { date, employees: [{ id: employee.id, name: employee.name, earlyShift: isWeekend }] }]
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
      }).filter(s => s.employees.length > 0)
    })
  }

  // Generate shifts for the month
  const generateShifts = () => {
    console.log('generating new!')
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const daysInMonth = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    const newShifts = []

    daysInMonth.forEach((date) => {
      if (date.getMonth() !== monthStart.getMonth()) return
      const dayOfWeek = getDay(date)
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
      const employeesNeeded = isWeekend ? WEEKEND_EMPLOYEES : WEEKDAY_EMPLOYEES

      const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1

      // Find tilgængelige medarbejdere (ikke på fridage)
      const availableEmployees = employees.filter((emp) => {
        const isAvailable = !emp.timeOffRequests.some(
          (timeOff) => timeOff.getTime() === date.getTime()
        )
        return isAvailable
      })

      if (availableEmployees.length === 0) {
        console.warn(`Ingen tilgængelige medarbejdere til ${format(date, "dd/MM/yyyy", { locale: da })}`)
        return
      }

      const assignedEmployees = []

      // Tæl nuværende vagter for hver medarbejder i denne måned
      const employeeShiftCounts = availableEmployees.map((emp) => ({
        employee: emp,
        shiftCount: newShifts.reduce((count, shift) => {
          return count + (shift.employees.some((e) => e.id === emp.id) ? 1 : 0)
        }, 0),
      }))

      // Filtrer medarbejdere, der ikke har nået deres maxShiftsPerMonth
      const eligibleEmployees = employeeShiftCounts.filter(
        ({ employee, shiftCount }) => shiftCount < (employee.maxShiftsPerMonth || Infinity)
      )

      if (eligibleEmployees.length < employeesNeeded) {
        console.warn(
          `Kun ${eligibleEmployees.length} af ${employeesNeeded} medarbejdere tilgængelige til ${format(date, "dd/MM/yyyy", { locale: da })}`
        )
      }

      // Først, tildel medarbejdere der foretrækker denne dag
      const preferredEmployees = eligibleEmployees.filter(({ employee }) =>
        employee.preferredDays.includes(adjustedDayOfWeek)
      )

      // Tildel foretrukne medarbejdere først (op til behovet)
      let earlyShiftAssigned = false
      preferredEmployees.slice(0, employeesNeeded).forEach(({ employee }, index) => {
        assignedEmployees.push({
          id: employee.id,
          name: employee.name,
          earlyShift: isWeekend && index === 0 && !earlyShiftAssigned
        })
        if (isWeekend && index === 0) earlyShiftAssigned = true
      })

      // Hvis der stadig mangler medarbejdere, tildel baseret på arbejdsmængde og vagttælling
      if (assignedEmployees.length < employeesNeeded) {
        const remainingEmployees = eligibleEmployees.filter(
          ({ employee }) => !assignedEmployees.some((assigned) => assigned.id === employee.id)
        )

        // Sorter efter arbejdsmængde præference og vagttælling
        remainingEmployees.sort((a, b) => {
          if (a.employee.workloadPreference === "high" && b.employee.workloadPreference !== "high") return -1
          if (b.employee.workloadPreference === "high" && a.employee.workloadPreference !== "high") return 1
          if (a.employee.workloadPreference === "low" && b.employee.workloadPreference !== "low") return 1
          if (b.employee.workloadPreference === "low" && a.employee.workloadPreference !== "low") return -1
          return a.shiftCount - b.shiftCount
        })

        // Tildel resterende medarbejdere
        const stillNeeded = employeesNeeded - assignedEmployees.length
        remainingEmployees.slice(0, stillNeeded).forEach(({ employee }, index) => {
          assignedEmployees.push({
            id: employee.id,
            name: employee.name,
            earlyShift: isWeekend && !earlyShiftAssigned
          })
          if (isWeekend && !earlyShiftAssigned) earlyShiftAssigned = true
        })
      }

      if (isWeekend && !earlyShiftAssigned && assignedEmployees.length > 0) {
        console.warn(
          `Ingen earlyShift tildelt til ${format(date, "dd/MM/yyyy", { locale: da })} - utilstrækkelige medarbejdere`
        )
        // Tildel earlyShift til første medarbejder som en fallback
        assignedEmployees[0].earlyShift = true
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

  const toggleEveningShift = (date, employeeId) => {
    setShifts(prevShifts =>
      prevShifts.map(shift => {
        if (shift.date.getTime() !== date.getTime()) return shift;

        const dayOfWeek = getDay(shift.date);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

        return {
          ...shift,
          employees: shift.employees.map(emp => {
            if (!isWeekend) {
              // For hverdage, toggle frit
              if (emp.id === employeeId) {
                const newEarlyShift = !emp.earlyShift;
                console.log(`Toggling ${emp.name}: earlyShift from ${emp.earlyShift} to ${newEarlyShift}`);
                return { ...emp, earlyShift: newEarlyShift };
              }
              return emp;
            }

            // For weekender, overfør earlyShift
            if (emp.id === employeeId) {
              const newEarlyShift = !emp.earlyShift;
              console.log(`Toggling ${emp.name}: earlyShift from ${emp.earlyShift} to ${newEarlyShift}`);
              return { ...emp, earlyShift: newEarlyShift };
            }
            // Fjern earlyShift fra andre medarbejdere
            if (emp.earlyShift) {
              console.log(`Removing earlyShift from ${emp.name}`);
              return { ...emp, earlyShift: false };
            }
            return emp;
          }),
        };
      })
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-8xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Vagtplanlægning</h1>
        <p className="text-muted-foreground">Administrer medarbejdere, fridage og generer vagtplaner</p>
      </div>

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList className="grid w-full h-full grid-cols-1 md:grid-cols-4 gap-2">
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
                  <Button onClick={addEmployee} className="text-center">
                    <Plus className="w-4 h-4 mr-2 text-center" />
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
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
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
                    <div>
                      <Label className="text-sm font-medium">Maks. antal vagter pr. måned</Label>
                      <Input
                        type="number"
                        min="0"
                        value={employee.maxShiftsPerMonth || ""}
                        onChange={(e) =>
                          setEmployees(employees.map((emp) =>
                            emp.id === employee.id ? { ...emp, maxShiftsPerMonth: Number(e.target.value) } : emp
                          ))
                        }
                        className="mt-2"
                      />
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
                <div className="w-full max-w-full flex flex-col md:flex-row break-all justify-between items-center">
                  <div>
                    <CardTitle>Vagtplan for {format(currentMonth, "MMMM yyyy", { locale: da })}</CardTitle>
                    <CardDescription>
                      Generer og se vagtplanen for måneden (2 på hverdage, 4 i weekender inkl. fredag)
                    </CardDescription>
                  </div>
                  <div className="flex flex-col md:flex-row gap-2 mt-2 md:mt-0">
                    <div className="flex flex-row gap-2">
                      <Button variant="outline" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        ← Forrige
                      </Button>
                      <Button variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        Næste →
                      </Button>
                    </div>
                    <Button onClick={generateShifts}>Generer Vagtplan</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ShiftCalendar 
                  shifts={shifts}
                  currentMonth={currentMonth}
                  employees={employees}
                  removeEmployeeFromShift={removeEmployeeFromShift}
                  toggleEveningShift={toggleEveningShift}
                  addEmployeeToShift={addEmployeeToShift}
                />
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
                  <li>I weekender tildeles én medarbejder automatisk en tidlig vagt (kl. 16)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}