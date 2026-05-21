# 💰 Budget App

A personal budgeting app that runs entirely on **your own computer** — no cloud, no subscriptions, no sharing your data with anyone. Open it in a browser, log in, and start tracking your finances.

**What you can do:**
- Track income from any pay schedule (weekly, biweekly, monthly, etc.)
- Add recurring monthly bills (rent, subscriptions, utilities)
- Log everyday purchases and group them by category
- See charts showing where your money goes, month by month

> **Your data stays on your machine.** Everything is stored in a small database file on your computer.

---

## 📋 What you need before you start

You need two free programs installed. Don't worry — the instructions below walk you through each one.

| Program | What it's for | Minimum version |
|---------|--------------|----------------|
| **Python** | Runs the app's backend | 3.10 or newer |
| **Node.js** | Runs the app's frontend | 18 or newer |

### Installing on a Mac 🍎

The easiest way is to use **Homebrew** (a free Mac package manager).

**1. Install Homebrew** (skip if you already have it):
Open the **Terminal** app and paste this, then press Enter:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**2. Install Python and Node.js:**
```bash
brew install python@3.10 node
```

**3. Verify it worked:**
```bash
python3 --version   # Should show Python 3.10 or higher
node --version      # Should show v18 or higher
```

### Installing on Linux 🐧

**Ubuntu / Debian:**
```bash
sudo apt update
sudo apt install python3.10 python3.10-venv python3-pip nodejs npm
```

**Fedora / RHEL:**
```bash
sudo dnf install python3.10 nodejs npm
```

---

## 🚀 Getting started (first time only)

**1. Download the project**

If you have Git installed:
```bash
git clone https://github.com/YOUR_USERNAME/budget.git
cd budget
```

Or click the green **Code** button on GitHub → **Download ZIP**, unzip it, and open a terminal in that folder.

**2. Run the one-time setup script**

This installs everything the app needs automatically:

```bash
./setup.sh
```

You'll see it working through two steps — installing the Python backend and the JavaScript frontend. It takes about 1–2 minutes.

> **Mac users:** If you get a "permission denied" error, run `chmod +x setup.sh` first, then try again.

---

## ▶️ Starting the app

Every time you want to use the app, open a terminal in the project folder and run:

```bash
./start.sh
```

Then open your browser and go to: **http://localhost:5173**

That's it! Press **Ctrl+C** in the terminal to stop the app when you're done.

> **First time?** Click **Sign up** to create your account, then log in.

---

## 📱 Using the app

Once you're logged in, use the sidebar on the left to navigate:

### Dashboard
Your monthly overview at a glance. See your total income, fixed expenses, actual spending, and how much is left over. Use the **← →** arrows to look at past months.

### Income
Add your income sources. Choose how often you get paid — the app automatically figures out your monthly equivalent:

| How you get paid | Example |
|-----------------|---------|
| Monthly | $5,000/month |
| Every 2 weeks | $2,300 every 2 weeks → ~$4,983/month |
| Weekly | $1,000/week → ~$4,333/month |
| Twice a month | $2,500 twice a month → $5,000/month |
| Once a year | $60,000/year → $5,000/month |

### Expenses
Add your recurring monthly bills — rent, car payment, Netflix, gym, etc. You can tag them with a category and even set the day they're due.

### Purchases
Log everyday purchases as you make them. Assign a category (like "Groceries" or "Dining Out") so you can see where your money actually goes. A bar chart shows spending by category for the month.

### Categories
Create your own color-coded categories to organize expenses and purchases. You can also create categories on the fly while adding a new expense or purchase.

### 💰 Savings Goals
Create goals for things you want to save up for — a vacation, new laptop, emergency fund, anything. Set a target amount and optional deadline. The app shows:
- A progress bar showing how much you've saved toward the goal
- How much you need to save per month to hit your deadline
- A full history of every contribution you've added

Click **＋ Add** on any goal to record money you've set aside. Mark goals complete when you've reached them!

### 🏠 Loans & Mortgage
Track any loan — mortgage, car, student, or personal. For each loan, the app shows:
- Current balance, interest rate, monthly payment, and how much of the loan is paid off
- A **payoff analysis** that calculates your exact payoff date and total interest you'll pay
- What happens if you pay a little extra each month — including how much interest you'd save and how many months sooner you'd be done
- A suggested extra payment based on 20% of your current month's available net budget

Click **📊 View payoff analysis** on any loan to see the comparison table.

---

## 🌙 Dark mode

Click the **🌙 / ☀️** button at the bottom of the sidebar to switch between dark and light mode. Your preference is saved automatically.

---

## 🛠️ Troubleshooting

**"Permission denied" when running a script**
```bash
chmod +x setup.sh start.sh backend/setup.sh
```

**"Python not found" error**
Make sure Python 3.10+ is installed. On a Mac with Homebrew: `brew install python@3.10`.
On Linux: `sudo apt install python3.10 python3.10-venv`.

**"npm not found" or "node not found" error**
Install Node.js 18+. On a Mac: `brew install node`. On Linux: `sudo apt install nodejs npm`.

**The app stopped working after I closed the terminal**
The app only runs while the terminal is open. Just run `./start.sh` again.

**I forgot my password / want to start fresh**
Delete the database file and restart:
```bash
rm backend/db.sqlite3
./start.sh
```
Then sign up again with a new account. *(This deletes all your data.)*

**Port already in use error**
Something else is using port 8000 or 5173. You can kill those processes:
```bash
lsof -ti:8000 | xargs kill -9  # free up port 8000
lsof -ti:5173 | xargs kill -9  # free up port 5173
```
Then run `./start.sh` again.

---

## 🔒 Security note

This app is designed for **local use only** — it's not hardened for exposure to the internet. Don't run it on a public IP address or shared server. Your login and data are secure when running on your own machine.

---

## 🧪 Running the tests (optional)

If you want to verify everything is working correctly:

```bash
cd backend
./run_tests.sh
```

You should see something like:
```
Ran 24 tests in ~20s
OK
```

---

## 📁 Project structure (for the curious)

```
budget/
├── setup.sh              ← Run once to set everything up
├── start.sh              ← Run every time to start the app
├── backend/              ← Python/Django server (API + database)
│   ├── setup.sh          ← Backend-specific setup (called by root setup.sh)
│   ├── run_tests.sh      ← Test suite
│   └── apps/
│       ├── users/        ← Login, signup, account management
│       └── budgets/      ← Income, expenses, purchases, categories
└── frontend/             ← React app (what you see in the browser)
    └── src/
        └── pages/        ← Dashboard, Income, Expenses, Purchases, Reports…
```

---

## 💡 Built with

- **Backend:** Python · Django · Django REST Framework · SQLite
- **Frontend:** React · TypeScript · Vite · Recharts
- **Auth:** JWT tokens (your session is secure and private)
# budget
