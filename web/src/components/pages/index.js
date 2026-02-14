// src/components/pages/index.js

import CurrentCallsPage from "./CurrentCallsPage.jsx";
import HistoryPage from "./HistoryPage.jsx";
import NewTicketPage from "./NewTicket.jsx";
import ToolsPage from "./Tools.jsx";
import InventoryPage from "./Inventory.jsx";
import TimesheetPage from "./Timesheet.jsx";
import WorkorderPage from "./Workorder.jsx";
import InfoPage from "./InfoPage.jsx";
import ManagerTickets from "./ManagerTickets.jsx";
import AdminUsers from "./AdminUsers.jsx";

export const PAGES = {
        CURRENT_CALLS: "current_calls",
        HISTORY: "history",
        NEW_TICKET: "new_ticket",
        TOOLS: "tools",
        INVENTORY: "inventory",
        TIMESHEET: "timesheet",
        WORKORDER: "workorder",
        INFO: "info",
        MANAGER_TICKETS: "manager_tickets",
        ADMIN_USERS: "admin_users",
};

export {
    CurrentCallsPage,
    HistoryPage,
    NewTicketPage,
    ToolsPage,
    InventoryPage,
    TimesheetPage,
    WorkorderPage,
    InfoPage,
    ManagerTickets,
    AdminUsers,
};
