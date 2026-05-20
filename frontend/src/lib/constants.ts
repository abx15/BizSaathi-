export const APP_METADATA = {
  name: "BizSaathi",
  tagline: "Aapka Business, Hamare Haath Mein",
  version: "1.0.0",
};

export const UI_TEXT = {
  auth: {
    title: "Login karein",
    tagline: "Aapka Business, Hamare Haath Mein",
    features: [
      {
        title: "Fast Invoicing",
        desc: "Customers ko WhatsApp aur SMS pe bill bhejein 10 seconds mein."
      },
      {
        title: "Kharcha Tracker",
        desc: "Apne roz ke business expenses ko sahi tareeqe se manage karein."
      },
      {
        title: "AI Reports",
        desc: "GST filings aur business performance ki simple Hinglish reports paayein."
      }
    ],
    phoneLabel: "Mobile Number",
    phonePlaceholder: "10-digit number likhein",
    sendOtpBtn: "OTP Bhejo",
    sendingOtp: "OTP Bhej rahe hain...",
    verifyTitle: "OTP Verification",
    verifySubtitle: "Humne {phone} par 6-digit code bheja hai",
    verifyBtn: "Verify & Login",
    verifying: "Verify kar rahe hain...",
    wrongOtp: "Galat OTP! Koshish karein firse.",
    otpComplete: "OTP validated!",
    resendOtp: "OTP firse bhejein",
    resendTimer: "seconds mein firse bhejein",
    newUserPrompt: "Pehli baar aa rahe hain? Free mein shuru karein!",
  },
  onboarding: {
    title: "Apne Business ki details bharein",
    progress: "Step {step} of 3",
    steps: {
      businessInfo: {
        title: "Business ki Jaankari",
        nameLabel: "Business Naam",
        namePlaceholder: "Jaise: Ramesh Traders, Gupta Electronics",
        typeLabel: "Business Type",
        types: {
          SHOP: { title: "Dukaan / Shop", desc: "Retail, Kirana, Wholesale" },
          SERVICE: { title: "Service Provider", desc: "Salon, Repairing, Agency" },
          MANUFACTURING: { title: "Manufacturing", desc: "Factory, Karkhana" },
          FREELANCER: { title: "Freelancer / Individual", desc: "Consultant, Tutor, Designer" },
          OTHER: { title: "Koyi aur / Other", desc: "Other types" }
        },
        cityLabel: "City",
        cityPlaceholder: "City naam",
        stateLabel: "State",
        statePlaceholder: "State select karein",
      },
      gstSetup: {
        title: "GST Setup",
        toggleLabel: "Kya aapke paas GST Number hai?",
        gstLabel: "GSTIN Number",
        gstPlaceholder: "15-digit GSTIN entered karein",
        invalidGst: "Invalid GST format (Jaise: 07AAAAA1111A1Z1)",
        infoTitle: "GST se kya faida hoga?",
        benefits: [
          "Bina kisi limit ke badhe bills banayein.",
          "Tax input credit ka poora faida lein.",
          "Legal and tax audit requirements se bilkul safe rahein."
        ],
      },
      whatsappSetup: {
        title: "WhatsApp Setup",
        toggleLabel: "WhatsApp par invoices aur updates bhejna chahte hain?",
        phoneLabel: "WhatsApp Number",
        phonePlaceholder: "WhatsApp number entered karein",
        previewTitle: "WhatsApp Preview",
        previewMsg: "Aapke customers ko aisa message milega:\n\n*Namaste!* Aapka bill amount *₹15,000* Ramesh Traders se ready hai. Invoice download karne ke liye niche link par click karein: bizsaathi.in/i/xyz",
      }
    },
    buttons: {
      next: "Aage Badhein",
      back: "Piche",
      skip: "Skip karo",
      finish: "Shuru Karte Hain!",
      loading: "Saving details..."
    }
  },
  dashboard: {
    sidebar: {
      dashboard: "Dashboard",
      invoices: "Invoices",
      expenses: "Expenses",
      staff: "Staff",
      crm: "CRM",
      aiReports: "AI Reports",
      settings: "Settings",
      logout: "Log Out",
    },
    topbar: {
      searchPlaceholder: "Search karein (Cmd + K)...",
      notifications: "Notifications",
      markAllRead: "Sabhi read karein",
      noNotifications: "Koyi notifications nahi hain",
      profile: "Profile",
      businessSettings: "Business Settings",
    },
    overview: {
      welcome: "Namaste, {name}!",
      businessLabel: "Business: {business}",
      totalSales: "Total Sales",
      unpaidInvoices: "Bacha hua Paisa",
      totalExpenses: "Total Expenses",
      netProfit: "Net Profit",
    }
  },
  errors: {
    phoneRequired: "Phone number likhna zaroori hai",
    phoneInvalid: "Phone number 10 digits ka hona chahiye",
    otpRequired: "6-digit OTP likhna zaroori hai",
    otpInvalid: "OTP exact 6 digits ka hona chahiye",
    businessNameRequired: "Business naam likhna zaroori hai",
    businessTypeRequired: "Business type select karein",
    cityRequired: "City likhna zaroori hai",
    stateRequired: "State select karein",
    generic: "Kuch galat ho gaya! Dobara koshish karein.",
  }
};

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", 
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Puducherry"
];

export const BUSINESS_TYPES = [
  { id: "SHOP", title: "Dukaan / Shop", desc: "Retail, Kirana, Wholesale" },
  { id: "SERVICE", title: "Service Provider", desc: "Salon, Repairing, Agency" },
  { id: "MANUFACTURING", title: "Manufacturing", desc: "Factory, Karkhana" },
  { id: "FREELANCER", title: "Freelancer / Individual", desc: "Consultant, Tutor, Designer" },
  { id: "OTHER", title: "Koyi aur / Other", desc: "Other types" }
];
