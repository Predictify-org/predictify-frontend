"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> & {
    sideOffset?: number;
  }
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

interface DropdownProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

interface DropdownTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

interface DropdownContentProps {
  children: React.ReactNode;
  className?: string;
  sideOffset?: number;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

interface DropdownItemProps {
  children: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  inset?: boolean;
  className?: string;
  shortcut?: string;
}

interface DropdownCheckboxItemProps {
  children: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

interface DropdownRadioItemProps {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}

interface DropdownRadioGroupProps {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
}

interface DropdownLabelProps {
  children: React.ReactNode;
  inset?: boolean;
  className?: string;
}

interface DropdownSeparatorProps {
  className?: string;
}

interface DropdownGroupProps {
  children: React.ReactNode;
}

interface DropdownSubProps {
  children: React.ReactNode;
}

interface DropdownSubTriggerProps {
  children: React.ReactNode;
  inset?: boolean;
  className?: string;
}

interface DropdownSubContentProps {
  children: React.ReactNode;
  className?: string;
}

const Dropdown = ({
  children,
  open,
  onOpenChange,
  modal = false,
  ...props
}: DropdownProps) => (
  <DropdownMenu open={open} onOpenChange={onOpenChange} modal={modal} {...props}>
    {children}
  </DropdownMenu>
);
Dropdown.displayName = DropdownMenuPrimitive.Root.displayName;

const DropdownTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  DropdownTriggerProps
>(({ children, asChild = false, ...props }, ref) => (
  <DropdownMenuTrigger ref={ref} asChild={asChild} {...props}>
    {children}
  </DropdownMenuTrigger>
));
DropdownTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;

const DropdownContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuContent>,
  DropdownContentProps
>(({ children, className, sideOffset, align, side, ...props }, ref) => (
  <DropdownMenuContent
    ref={ref}
    className={className}
    sideOffset={sideOffset}
    align={align}
    side={side}
    {...props}
  >
    {children}
  </DropdownMenuContent>
));
DropdownContent.displayName = DropdownMenuContent.displayName;

const DropdownItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuItem>,
  DropdownItemProps
>(({ children, onSelect, disabled, inset, className, shortcut, ...props }, ref) => (
  <DropdownMenuItem
    ref={ref}
    className={className}
    inset={inset}
    disabled={disabled}
    onSelect={onSelect}
    {...props}
  >
    {children}
    {shortcut && <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>}
  </DropdownMenuItem>
));
DropdownItem.displayName = DropdownMenuItem.displayName;

const DropdownCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuCheckboxItem>,
  DropdownCheckboxItemProps
>(({ children, checked, onCheckedChange, disabled, className, ...props }, ref) => (
  <DropdownMenuCheckboxItem
    ref={ref}
    className={className}
    checked={checked}
    onCheckedChange={onCheckedChange}
    disabled={disabled}
    {...props}
  >
    {children}
  </DropdownMenuCheckboxItem>
));
DropdownCheckboxItem.displayName = DropdownMenuCheckboxItem.displayName;

const DropdownRadioGroup = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioGroup>,
  DropdownRadioGroupProps
>(({ children, value, onValueChange, ...props }, ref) => (
  <DropdownMenuRadioGroup ref={ref} value={value} onValueChange={onValueChange} {...props}>
    {children}
  </DropdownMenuRadioGroup>
));
DropdownRadioGroup.displayName = DropdownMenuPrimitive.RadioGroup.displayName;

const DropdownRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuRadioItem>,
  DropdownRadioItemProps
>(({ children, value, disabled, className, ...props }, ref) => (
  <DropdownMenuRadioItem
    ref={ref}
    className={className}
    value={value}
    disabled={disabled}
    {...props}
  >
    {children}
  </DropdownMenuRadioItem>
));
DropdownRadioItem.displayName = DropdownMenuRadioItem.displayName;

const DropdownLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuLabel>,
  DropdownLabelProps
>(({ children, inset, className, ...props }, ref) => (
  <DropdownMenuLabel ref={ref} className={className} inset={inset} {...props}>
    {children}
  </DropdownMenuLabel>
));
DropdownLabel.displayName = DropdownMenuLabel.displayName;

const DropdownSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuSeparator>,
  DropdownSeparatorProps
>(({ className, ...props }, ref) => (
  <DropdownMenuSeparator ref={ref} className={className} {...props} />
));
DropdownSeparator.displayName = DropdownMenuSeparator.displayName;

const DropdownGroup = React.forwardRef<
  React.ElementRef<typeof DropdownMenuGroup>,
  DropdownGroupProps
>(({ children, ...props }, ref) => (
  <DropdownMenuGroup ref={ref} {...props}>
    {children}
  </DropdownMenuGroup>
));
DropdownGroup.displayName = DropdownMenuGroup.displayName;

const DropdownSub = ({
  children,
  ...props
}: DropdownSubProps) => (
  <DropdownMenuSub {...props}>
    {children}
  </DropdownMenuSub>
);
DropdownSub.displayName = DropdownMenuPrimitive.Sub.displayName;

const DropdownSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuSubTrigger>,
  DropdownSubTriggerProps
>(({ children, inset, className, ...props }, ref) => (
  <DropdownMenuSubTrigger ref={ref} className={className} inset={inset} {...props}>
    {children}
  </DropdownMenuSubTrigger>
));
DropdownSubTrigger.displayName = DropdownMenuSubTrigger.displayName;

const DropdownSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuSubContent>,
  DropdownSubContentProps
>(({ children, className, ...props }, ref) => (
  <DropdownMenuSubContent ref={ref} className={className} {...props}>
    {children}
  </DropdownMenuSubContent>
));
DropdownSubContent.displayName = DropdownMenuSubContent.displayName;

export {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownCheckboxItem,
  DropdownRadioGroup,
  DropdownRadioItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownGroup,
  DropdownSub,
  DropdownSubTrigger,
  DropdownSubContent,
  DropdownMenuShortcut,
};

export type {
  DropdownProps,
  DropdownTriggerProps,
  DropdownContentProps,
  DropdownItemProps,
  DropdownCheckboxItemProps,
  DropdownRadioItemProps,
  DropdownRadioGroupProps,
  DropdownLabelProps,
  DropdownSeparatorProps,
  DropdownGroupProps,
  DropdownSubProps,
  DropdownSubTriggerProps,
  DropdownSubContentProps,
};