export interface TempInterface {}

export enum POStatus {
  Draft = "Draft",
  PendingL1Approval = "PendingL1Approval",
  PendingL2Approval = "PendingL2Approval",
  Approved = "Approved",
  Rejected = "Rejected",
  Cancelled = "Cancelled",
  Completed = "Completed",
  Closed = "Closed",
  Invoiced = "Invoiced",
}

export enum RequisitionStatus {
  Draft = "Draft",
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
  ConvertedToPO = "ConvertedToPO",
  Cancelled = "Cancelled",
}

export enum InvoiceStatus {
  Draft = "Draft",
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
  Paid = "Paid",
  PartiallyPaid = "PartiallyPaid",
  Overdue = "Overdue",
  Cancelled = "Cancelled",
}

export enum RFQStatus {
  Draft = "Draft",
  Pending = "Pending",
  Sent = "Sent",
  ResponsesReceived = "ResponsesReceived",
  Awarded = "Awarded",
  Closed = "Closed",
  Cancelled = "Cancelled",
}

export enum PaymentMethod {
  CreditCard = "CreditCard",
  BankTransfer = "BankTransfer",
  PayPal = "PayPal",
  Other = "Other",
}

export enum PaymentStatus {
  Pending = "Pending",
  Paid = "Paid",
  PartiallyPaid = "PartiallyPaid",
  Overdue = "Overdue",
  Cancelled = "Cancelled",
}

export enum RFQVendorResponseStatus {
  Pending = "Pending",
  Submitted = "Submitted",
  Awarded = "Awarded",
  Rejected = "Rejected",
}

export enum ApprovalStepStatus {
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
  Skipped = "Skipped",
}

export enum VendorStatus {
  Active = "Active",
  Inactive = "Inactive",
  OnHold = "OnHold",
  Blacklisted = "Blacklisted",
}

export enum GoodsReceiptStatus {
  Pending = "Pending",
  Received = "Received",
  PartiallyReceived = "PartiallyReceived",
  Cancelled = "Cancelled",
}

export enum TaskStatus {
  Open = "Open",
  InProgress = "InProgress",
  Completed = "Completed",
  Blocked = "Blocked",
}

export enum TaskPriority {
  Low = "Low",
  Medium = "Medium",
  High = "High",
  Urgent = "Urgent",
}

export enum UserRole {
  Admin = "Admin",
  Approver = "Approver",
  Requester = "Requester",
  Vendor = "Vendor",
  Viewer = "Viewer",
}