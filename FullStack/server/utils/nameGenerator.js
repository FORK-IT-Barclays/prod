const names = [
    "Aarav Patel", "Aditi Sharma", "Rohan Singh", "Priya Verma",
    "Arjun Nair", "Neha Gupta", "Vikram Reddy", "Kavya Menon",
    "Rahul Desai", "Sneha Joshi", "Aditya Iyer", "Pooja Pillai",
    "Karan Mehta", "Riya Kapoor", "Sanjay Bhat", "Ananya Rao",
    "Gaurav Das", "Meera Krishnan", "Rishi Tiwari", "Swati Nandi",
    "Akhil Saxena", "Tarun Chatterjee", "Kriti Jain", "Ishaan Malhotra",
    "Isha Choudhury", "Dhruv Bansal", "Tanya Agarwal", "Varun Chauhan",
    "Nisha Thakur", "Pranav Shetty", "Shreya Bhatia", "Yash Ahuja",
    "Simran Kaur", "Harsh Vardhan", "Rupali Deshmukh", "Nikhil Kadam",
    "Tanvi Kulkarni", "Vivek Patil", "Mansi Joshi", "Kunal Mistry",
    "Megha Bhat", "Abhishek Pandit", "Pallavi Rawat", "Tejas Prabhu",
    "Deepika Hegde", "Manoj Srinivasan", "Radhika Raman", "Sarvesh Naik"
];

export function getCustomerName(accountId) {
    if (!accountId) return "Unknown Customer";
    let hash = 0;
    for (let i = 0; i < accountId.length; i++) {
        hash = ((hash << 5) - hash) + accountId.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % names.length;
    return names[index];
}
