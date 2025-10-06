"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, ControllerRenderProps } from "react-hook-form"
import { z } from "zod"
import { Send, CheckCircle, Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const contactFormSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(100, "Email must be less than 100 characters"),
  subject: z.string().min(1, "Please select a topic"),
  message: z.string()
    .min(10, "Message must be at least 10 characters long")
    .max(1000, "Message must be less than 1000 characters"),
})

type ContactFormValues = z.infer<typeof contactFormSchema>

type FieldProps<T extends keyof ContactFormValues> = {
  field: ControllerRenderProps<ContactFormValues, T>
}

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

const subjectOptions = [
  { value: "general", label: "General Inquiry" },
  { value: "technical", label: "Technical Support" },
  { value: "billing", label: "Billing & Payments" },
  { value: "account", label: "Account Issues" },
  { value: "bug-report", label: "Bug Report" },
  { value: "feature-request", label: "Feature Request" },
  { value: "other", label: "Other" },
]

interface ContactSupportFormProps {
  className?: string
  showTitle?: boolean
  showDescription?: boolean
}

export function ContactSupportForm({ 
  className = "",
  showTitle = true,
  showDescription = true 
}: ContactSupportFormProps) {
  const [formStatus, setFormStatus] = useState<FormStatus>('idle')
  
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  })

  async function onSubmit(values: ContactFormValues) {
    setFormStatus('loading')
    
    try {
      // Simulate API call - replace with your actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Example API call:
      // const response = await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(values),
      // })
      // if (!response.ok) throw new Error('Failed to submit')
      
      console.log("Form submitted:", values)
      setFormStatus('success')
      form.reset()
      
      // Reset success state after 3 seconds
      setTimeout(() => setFormStatus('idle'), 3000)
    } catch (error) {
      console.error('Form submission error:', error)
      setFormStatus('error')
      
      // Reset error state after 5 seconds
      setTimeout(() => setFormStatus('idle'), 5000)
    }
  }

  return (
    <Card className={`w-full ${className}`}>
      {(showTitle || showDescription) && (
        <CardHeader className="space-y-7 pb-7">
          {showTitle && (
            <h2 className="text-2xl font-bold ">Contact Support</h2>
          )}
          {showDescription && (
            <p className=" text-sm">
              Need help with something specific? Our support team is here to assist you.
            </p>
          )}
        </CardHeader>
      )}
      <CardContent className={showTitle || showDescription ? "pt-0" : ""}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }: FieldProps<"name">) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                      <Input 
                        {...field} 
                        className=""
                        aria-describedby={field.name + "-error"}
                        autoComplete="name"
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }: FieldProps<"email">) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                      <Input 
                        type="email" 
                        {...field} 
                        className=""
                        aria-describedby={field.name + "-error"}
                        autoComplete="email"
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }: FieldProps<"subject">) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="">
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjectOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }: FieldProps<"message">) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                      <Textarea
                        placeholder="Please provide as much detail as possible..."
                        className="min-h-[120px] resize-none "
                        aria-describedby={field.name + "-error"}
                        {...field}
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Button 
                type="submit" 
                disabled={formStatus === 'loading' || formStatus === 'success'}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 rounded-md transition-colors"
              >
                {formStatus === 'loading' && (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                )}
                {formStatus === 'success' && (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Message Sent!
                  </>
                )}
                {formStatus === 'error' && (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Try Again
                  </>
                )}
                {formStatus === 'idle' && (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
              
              {formStatus === 'success' && (
                <p className="text-sm text-green-600 text-center">
                  Thank you! Your message has been sent successfully. We'll get back to you soon.
                </p>
              )}
              
              {formStatus === 'error' && (
                <p className="text-sm text-red-600 text-center">
                  Something went wrong. Please try again or contact us directly.
                </p>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
