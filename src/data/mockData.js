export const users = [
  { id: 1, name: 'Arjun Sharma', email: 'arjun@example.com', room: 'Room 101', joinDate: '2024-01-15', status: 'Active' },
  { id: 2, name: 'Priya Patel', email: 'priya@example.com', room: 'Room 102', joinDate: '2024-02-20', status: 'Active' },
  { id: 3, name: 'Rahul Verma', email: 'rahul@example.com', room: 'Room 101', joinDate: '2024-01-10', status: 'Inactive' },
  { id: 4, name: 'Sneha Nair', email: 'sneha@example.com', room: 'Room 103', joinDate: '2024-03-05', status: 'Active' },
  { id: 5, name: 'Amit Kumar', email: 'amit@example.com', room: 'Room 104', joinDate: '2024-02-14', status: 'Active' },
  { id: 6, name: 'Pooja Singh', email: 'pooja@example.com', room: 'Room 102', joinDate: '2024-03-20', status: 'Suspended' },
  { id: 7, name: 'Vikram Rao', email: 'vikram@example.com', room: 'Room 105', joinDate: '2024-01-25', status: 'Active' },
  { id: 8, name: 'Ananya Das', email: 'ananya@example.com', room: 'Room 103', joinDate: '2024-04-01', status: 'Active' },
  { id: 9, name: 'Rohan Mehta', email: 'rohan@example.com', room: 'Room 104', joinDate: '2024-02-08', status: 'Inactive' },
  { id: 10, name: 'Kavya Reddy', email: 'kavya@example.com', room: 'Room 105', joinDate: '2024-03-15', status: 'Active' },
];

export const rooms = [
  { id: 1, name: 'Room 101', members: 3, location: 'Block A, Pune', createdDate: '2023-12-01', status: 'Active' },
  { id: 2, name: 'Room 102', members: 2, location: 'Block B, Mumbai', createdDate: '2024-01-10', status: 'Active' },
  { id: 3, name: 'Room 103', members: 4, location: 'Block A, Bangalore', createdDate: '2024-01-15', status: 'Active' },
  { id: 4, name: 'Room 104', members: 2, location: 'Block C, Delhi', createdDate: '2024-02-01', status: 'Inactive' },
  { id: 5, name: 'Room 105', members: 3, location: 'Block B, Hyderabad', createdDate: '2024-02-20', status: 'Active' },
  { id: 6, name: 'Room 106', members: 1, location: 'Block D, Chennai', createdDate: '2024-03-01', status: 'Active' },
  { id: 7, name: 'Room 107', members: 4, location: 'Block A, Kolkata', createdDate: '2024-03-10', status: 'Active' },
  { id: 8, name: 'Room 108', members: 2, location: 'Block C, Pune', createdDate: '2024-03-25', status: 'Inactive' },
];

export const bugReports = [
  { id: 1, title: 'Expense split not calculating correctly', reporter: 'Arjun Sharma', date: '2024-04-10', priority: 'High', status: 'Open' },
  { id: 2, title: 'Push notifications delayed by 10 minutes', reporter: 'Priya Patel', date: '2024-04-11', priority: 'Medium', status: 'Under Process' },
  { id: 3, title: 'Chore reminder not showing up', reporter: 'Rahul Verma', date: '2024-04-09', priority: 'Low', status: 'Solved' },
  { id: 4, title: 'Cannot add new member to room', reporter: 'Sneha Nair', date: '2024-04-12', priority: 'High', status: 'Open' },
  { id: 5, title: 'Budget chart not rendering on iOS', reporter: 'Amit Kumar', date: '2024-04-08', priority: 'Medium', status: 'Under Process' },
  { id: 6, title: 'Login screen freezes on Android 14', reporter: 'Pooja Singh', date: '2024-04-13', priority: 'High', status: 'Open' },
  { id: 7, title: 'Profile picture upload fails', reporter: 'Vikram Rao', date: '2024-04-07', priority: 'Low', status: 'Solved' },
  { id: 8, title: 'Monthly budget reset not working', reporter: 'Ananya Das', date: '2024-04-14', priority: 'High', status: 'Open' },
  { id: 9, title: 'Dark mode text unreadable', reporter: 'Rohan Mehta', date: '2024-04-06', priority: 'Medium', status: 'Solved' },
  { id: 10, title: 'Expense history export returns empty file', reporter: 'Kavya Reddy', date: '2024-04-15', priority: 'High', status: 'Under Process' },
];

export const notifications = [
  { id: 1, title: 'App Update Available', message: 'OneRoom v2.1 is now available. Update for new features!', sentTo: 'All Users', date: '2024-04-10', status: 'Sent' },
  { id: 2, title: 'Maintenance Scheduled', message: 'Server maintenance on April 20th from 2-4 AM IST.', sentTo: 'All Users', date: '2024-04-11', status: 'Sent' },
  { id: 3, title: 'Bug Fix Deployed', message: 'The expense calculation bug has been fixed. Enjoy!', sentTo: 'Arjun Sharma', date: '2024-04-12', status: 'Sent' },
  { id: 4, title: 'Welcome to OneRoom', message: 'Welcome! Get started by creating your first room.', sentTo: 'Kavya Reddy', date: '2024-04-15', status: 'Sent' },
];

export const dashboardStats = {
  totalUsers: 10,
  totalRooms: 8,
  openBugs: 4,
  notificationsSent: 4,
};

export const userGrowthData = [
  { month: 'Nov', users: 2 },
  { month: 'Dec', users: 3 },
  { month: 'Jan', users: 6 },
  { month: 'Feb', users: 8 },
  { month: 'Mar', users: 9 },
  { month: 'Apr', users: 10 },
];

export const bugStatusData = [
  { name: 'Open', value: 4 },
  { name: 'Under Process', value: 3 },
  { name: 'Solved', value: 3 },
];

export const roomActivityData = [
  { month: 'Nov', rooms: 1 },
  { month: 'Dec', rooms: 2 },
  { month: 'Jan', rooms: 4 },
  { month: 'Feb', rooms: 6 },
  { month: 'Mar', rooms: 7 },
  { month: 'Apr', rooms: 8 },
];
