export type User = { id: number; username: string; email: string }

export type CategoryTheme = {
  id: number
  name: string
  monthly_budget: string | null
  active_amount: string
  created_at: string
}

export type Category = {
  id: number
  name: string
  theme: string | null
  color: string
  monthly_budget: string | null
  created_at: string
}

export type IncomeSalaryChange = {
  id: number
  income_source: number
  effective_date: string
  amount: string
  note: string
  created_at: string
}

export type IncomeSource = {
  id: number
  name: string
  amount: string
  cadence: string
  is_active: boolean
  monthly_equivalent: string
  salary_history: IncomeSalaryChange[]
  created_at: string
}

export type RecurringExpense = {
  id: number
  category: number | null
  category_name: string | null
  name: string
  amount: string
  due_day: number | null
  is_active: boolean
  created_at: string
}

export type Purchase = {
  id: number
  category: number | null
  category_name: string | null
  description: string
  amount: string
  date: string
  notes: string
  month: string
  created_at: string
}

export type BudgetSummary = {
  month: string
  monthly_income: string
  monthly_expenses: string
  spending_this_month: string
  net_budget: string
  spending_by_category: {
    category_id: number | null
    category_name: string
    color: string
    total: string
  }[]
}

export type SavingsContribution = {
  id: number
  goal: number
  amount: string
  date: string
  note: string
  created_at: string
}

export type SavingsGoal = {
  id: number
  name: string
  target_amount: string
  current_amount: string
  percent_complete: number
  target_date: string | null
  notes: string
  is_complete: boolean
  monthly_needed: string | null
  contributions: SavingsContribution[]
  created_at: string
  updated_at: string
}

export type Loan = {
  id: number
  name: string
  loan_type: string
  loan_type_display: string
  original_amount: string
  current_balance: string
  interest_rate: string
  monthly_payment: string
  start_date: string
  term_months: number | null
  extra_payment: string
  notes: string
  created_at: string
  updated_at: string
}

export type LoanPayoffScenario = {
  extra_payment: string
  months: number | null
  payoff_date: string | null
  total_interest: string | null
  interest_saved: string | null
  months_saved: number | null
}

export type LoanAnalysis = {
  loan_id: number
  current_balance: string
  interest_rate: string
  monthly_payment: string
  current_extra_payment: string
  net_budget_this_month: string
  suggested_extra_payment: string
  standard: { months: number | null; payoff_date: string | null; total_interest: string | null }
  with_current_extra: LoanPayoffScenario
  with_suggested_extra: LoanPayoffScenario
}
