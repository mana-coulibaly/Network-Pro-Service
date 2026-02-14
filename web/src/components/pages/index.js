// src/components/pages/index.js

import CurrentCallsPage from "./CurrentCallsPage.jsx";
import HistoryPage from "./HistoryPage.jsx";
import NewTicketPage from "./NewTicket.jsx";
import ToolsPage from "./Tools.jsx";
import InventoryPage from "./Inventory.jsx";
import TimesheetPage from "./Timesheet.jsx";
import WorkorderPage from "./Workorder.jsx";
import ProfilePage from "./ProfilePage.jsx";
import EmployeesPage from "./EmployeesPage.jsx";
import ManagerTickets from "./ManagerTickets.jsx";
import AdminUsers from "./AdminUsers.jsx";
import AdminDashboard from "./AdminDashboard.jsx";

export const PAGES = {
        CURRENT_CALLS: "current_calls",
        HISTORY: "history",
        NEW_TICKET: "new_ticket",
        TOOLS: "tools",
        INVENTORY: "inventory",
        TIMESHEET: "timesheet",
        WORKORDER: "workorder",
        INFO: "info",
        EMPLOYEES: "employees",
        MANAGER_TICKETS: "manager_tickets",
        ADMIN_USERS: "admin_users",
        ADMIN_DASHBOARD: "admin_dashboard",
};

export {
    CurrentCallsPage,
    HistoryPage,
    NewTicketPage,
    ToolsPage,
    InventoryPage,
    TimesheetPage,
    WorkorderPage,
    ProfilePage,
    EmployeesPage,
    ManagerTickets,
    AdminUsers,
    AdminDashboard,
};
