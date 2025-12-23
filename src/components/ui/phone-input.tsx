import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

// Common country codes
const countries = [
    { value: "+91", label: "India (+91)", flag: "🇮🇳" },
    { value: "+1", label: "USA/Canada (+1)", flag: "🇺🇸" },
    { value: "+44", label: "UK (+44)", flag: "🇬🇧" },
    { value: "+971", label: "UAE (+971)", flag: "🇦🇪" },
    { value: "+61", label: "Australia (+61)", flag: "🇦🇺" },
    { value: "+49", label: "Germany (+49)", flag: "🇩🇪" },
    { value: "+33", label: "France (+33)", flag: "🇫🇷" },
    { value: "+86", label: "China (+86)", flag: "🇨🇳" },
    { value: "+81", label: "Japan (+81)", flag: "🇯🇵" },
    { value: "+65", label: "Singapore (+65)", flag: "🇸🇬" },
    // Add others as needed, starting with major ones
]

interface PhoneInputProps {
    value?: string
    onChange: (value: string) => void
    className?: string
    placeholder?: string
}

export function PhoneInput({ value, onChange, className, placeholder = "Phone number" }: PhoneInputProps) {
    const [open, setOpen] = React.useState(false)

    // Parse initial value
    const parseValue = (val: string | undefined) => {
        if (!val) return { code: "+91", number: "" }

        // Sort logic to match longest code first to avoid partial matches (e.g. +1 vs +12)
        const sortedCountries = [...countries].sort((a, b) => b.value.length - a.value.length)

        for (const country of sortedCountries) {
            if (val.startsWith(country.value)) {
                return {
                    code: country.value,
                    number: val.slice(country.value.length)
                }
            }
        }

        // Default fallback if no code matches or it's just a raw number
        return { code: "+91", number: val.replace(/^\+/, '') }
    }

    const [countryCode, setCountryCode] = React.useState(parseValue(value).code)
    const [phoneNumber, setPhoneNumber] = React.useState(parseValue(value).number)

    // Update parent when internal state changes
    const updateValue = (newCode: string, newNumber: string) => {
        setCountryCode(newCode)
        setPhoneNumber(newNumber)
        if (newNumber) {
            onChange(`${newCode}${newNumber}`)
        } else {
            onChange("")
        }
    }

    // Handle external value changes (e.g. form reset)
    React.useEffect(() => {
        const { code, number } = parseValue(value)
        // Only update if different to avoid cursor jumping or loops
        if (code !== countryCode || number !== phoneNumber) {
            // Simple check, nuances exists but sufficient for reset
            if (!value) {
                setCountryCode("+91")
                setPhoneNumber("")
            } else {
                setCountryCode(code)
                setPhoneNumber(number)
            }
        }
    }, [value])

    const selectedCountry = countries.find((country) => country.value === countryCode)

    return (
        <div className={cn("flex gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-[110px] justify-between px-2"
                    >
                        {selectedCountry ? (
                            <span className="flex items-center gap-1">
                                <span className="text-base">{selectedCountry.flag}</span>
                                <span className="text-xs text-muted-foreground">{selectedCountry.value}</span>
                            </span>
                        ) : "+_"}
                        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0">
                    <Command>
                        <CommandInput placeholder="Search country..." />
                        <CommandList>
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup>
                                {countries.map((country) => (
                                    <CommandItem
                                        key={country.value}
                                        value={country.label}
                                        onSelect={() => {
                                            updateValue(country.value, phoneNumber)
                                            setOpen(false)
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                countryCode === country.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <span className="mr-2 text-xl">{country.flag}</span>
                                        {country.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <Input
                type="tel"
                placeholder={placeholder}
                value={phoneNumber}
                onChange={(e) => {
                    // Allow only numbers and maybe spaces/dashes (stripped later)
                    // For now, let's keep it simple
                    updateValue(countryCode, e.target.value)
                }}
                className="flex-1"
            />
        </div>
    )
}
