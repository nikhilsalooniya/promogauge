import type { WheelSegment, LeadFormField } from "./types";

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  campaignType: "spinwheel" | "scratch";
  wheelSegments: WheelSegment[];
  wheelColors: { primary: string; secondary: string };
  leadFormFields: LeadFormField[];
}

// Map template IDs to their campaign types (scratch vs spinwheel)
const scratchTemplateIds = [
  'christmas-scratch',
  'instant-discount-scratch',
  'free-gift-scratch',
  'back-to-school-scratch',
  'instant-coupon-scratch'
];

export const getTemplateCampaignType = (templateId: string): "spinwheel" | "scratch" => {
  return scratchTemplateIds.includes(templateId) ? "scratch" : "spinwheel";
};

export const campaignTemplates: CampaignTemplate[] = [
  // Spin the Wheel Templates
  {
    id: "retail-sale",
    name: "Discount Campaign",
    description: "Optimized for retail shops, ecommerce, boutiques",
    category: "Retail",
    icon: "Percent",
    campaignType: "spinwheel",
    wheelSegments: [
      { 
        label: "10% OFF", 
        color: "#6366f1",
        icon: "🎉",
        prize_type: "discount",
        prize_description: "Get 10% off your next purchase.",
        redemption_instructions: "Use at checkout in-store or online."
      },
      { 
        label: "20% OFF", 
        color: "#8b5cf6",
        icon: "🛍️",
        prize_type: "discount",
        prize_description: "Save 20% on any item.",
        redemption_instructions: "Applicable once per customer."
      },
      { 
        label: "KSh 500 Voucher", 
        color: "#6366f1",
        icon: "💳",
        prize_type: "coupon",
        prize_description: "KSh 500 off minimum spend KSh 2000.",
        redemption_instructions: "Show code during payment."
      },
      { 
        label: "Free Gift", 
        color: "#8b5cf6",
        icon: "🎁",
        prize_type: "free_gift",
        prize_description: "Free mystery gift with your next visit.",
        redemption_instructions: "Collect at cashier."
      },
      { 
        label: "Try Again", 
        color: "#6366f1",
        icon: "❌",
        prize_type: "no_win",
        prize_description: "Almost! Try again soon.",
        redemption_instructions: ""
      },
    ],
    wheelColors: { primary: "#6366f1", secondary: "#8b5cf6" },
    leadFormFields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
    ],
  },
  {
    id: "restaurant-promo",
    name: "Restaurant Promotion",
    description: "Great for restaurants and food businesses",
    category: "Food & Beverage",
    icon: "UtensilsCrossed",
    campaignType: "spinwheel",
    wheelSegments: [
      { 
        label: "Free Burger", 
        color: "#ec4899",
        icon: "🍔",
        prize_type: "free_gift",
        prize_description: "Enjoy a free classic burger.",
        redemption_instructions: "Dine-in only."
      },
      { 
        label: "15% OFF Meal", 
        color: "#f43f5e",
        icon: "🍕",
        prize_type: "discount",
        prize_description: "Valid on all menu items.",
        redemption_instructions: "Show code to waiter."
      },
      { 
        label: "Free Soft Drink", 
        color: "#ec4899",
        icon: "🥤",
        prize_type: "free_gift",
        prize_description: "Any soda of your choice.",
        redemption_instructions: ""
      },
      { 
        label: "Free Dessert", 
        color: "#f43f5e",
        icon: "🍰",
        prize_type: "free_gift",
        prize_description: "Choose from the day's special desserts.",
        redemption_instructions: ""
      },
      { 
        label: "Try Again", 
        color: "#ec4899",
        icon: "❌",
        prize_type: "no_win",
        prize_description: "Better luck next time!",
        redemption_instructions: ""
      },
    ],
    wheelColors: { primary: "#ec4899", secondary: "#f43f5e" },
    leadFormFields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone Number", type: "tel", required: true },
    ],
  },
  {
    id: "service-lead-gen",
    name: "Service Lead Generation",
    description: "Ideal for salons, plumbers, real estate, agencies, etc.",
    category: "Services",
    icon: "Briefcase",
    campaignType: "spinwheel",
    wheelSegments: [
      { 
        label: "Free Consultation", 
        color: "#10b981",
        icon: "💼",
        prize_type: "reward",
        prize_description: "Get a free 15-min consultation.",
        redemption_instructions: ""
      },
      { 
        label: "KSh 500 Discount", 
        color: "#059669",
        icon: "💰",
        prize_type: "discount",
        prize_description: "Valid on first service.",
        redemption_instructions: ""
      },
      { 
        label: "PDF Guide Download", 
        color: "#10b981",
        icon: "📄",
        prize_type: "digital_reward",
        prize_description: "Get our free guide.",
        redemption_instructions: ""
      },
      { 
        label: "Priority Booking", 
        color: "#059669",
        icon: "⭐",
        prize_type: "reward",
        prize_description: "Get priority on our schedule.",
        redemption_instructions: ""
      },
      { 
        label: "Not This Time", 
        color: "#10b981",
        icon: "❌",
        prize_type: "no_win",
        prize_description: "Try again next time!",
        redemption_instructions: ""
      },
    ],
    wheelColors: { primary: "#10b981", secondary: "#059669" },
    leadFormFields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "phone", label: "Phone", type: "tel", required: true },
      { name: "email", label: "Email", type: "email", required: false },
      { name: "custom_field_value", label: "Service Needed", type: "text", required: true },
    ],
  },
  {
    id: "event-registration",
    name: "Event Registration",
    description: "Perfect for event promotions and registrations",
    category: "Events",
    icon: "Ticket",
    campaignType: "spinwheel",
    wheelSegments: [
      { label: "VIP Pass", color: "#f59e0b" },
      { label: "Early Bird", color: "#d97706" },
      { label: "Free Merch", color: "#f59e0b" },
      { label: "Group Discount", color: "#d97706" },
      { label: "Standard Entry", color: "#f59e0b" },
      { label: "Try Again", color: "#d97706" },
    ],
    wheelColors: { primary: "#f59e0b", secondary: "#d97706" },
    leadFormFields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "tel", required: false },
    ],
  },
  {
    id: "gym-membership",
    name: "Gym & Fitness",
    description: "For fitness centers and gyms running membership drives",
    category: "Health & Fitness",
    icon: "Dumbbell",
    campaignType: "spinwheel",
    wheelSegments: [
      { label: "1 Month Free", color: "#3b82f6" },
      { label: "Personal Training", color: "#2563eb" },
      { label: "50% Off", color: "#3b82f6" },
      { label: "Free Classes", color: "#2563eb" },
      { label: "Try Again", color: "#3b82f6" },
      { label: "Gym Gear", color: "#2563eb" },
    ],
    wheelColors: { primary: "#3b82f6", secondary: "#2563eb" },
    leadFormFields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "tel", required: true },
    ],
  },
  {
    id: "giveaway",
    name: "Giveaway Campaign",
    description: "Perfect for brand awareness and promotional giveaways",
    category: "Marketing",
    icon: "Gift",
    campaignType: "spinwheel",
    wheelSegments: [
      { label: "Branded T-Shirt", color: "#06b6d4" },
      { label: "Mug", color: "#0891b2" },
      { label: "Voucher", color: "#06b6d4" },
      { label: "Gift Hamper", color: "#0891b2" },
      { label: "Sticker Pack", color: "#06b6d4" },
      { label: "Try Again", color: "#0891b2" },
    ],
    wheelColors: { primary: "#06b6d4", secondary: "#0891b2" },
    leadFormFields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone Number", type: "tel", required: false },
    ],
  },
  {
    id: "educational-games",
    name: "Educational Games",
    description: "Perfect for teachers and educational activities",
    category: "Education",
    icon: "GraduationCap",
    campaignType: "spinwheel",
    wheelSegments: [
      { 
        label: "Random Question", 
        color: "#8b5cf6",
        icon: "📚",
        prize_type: "custom",
        prize_description: "Teacher reads a question aloud.",
        redemption_instructions: ""
      },
      { 
        label: "Pick Category", 
        color: "#6366f1",
        icon: "🎯",
        prize_type: "custom",
        prize_description: "Teacher selects from category wheel.",
        redemption_instructions: ""
      },
      { 
        label: "Bonus Star", 
        color: "#8b5cf6",
        icon: "⭐",
        prize_type: "reward",
        prize_description: "Earn a bonus star!",
        redemption_instructions: ""
      },
      { 
        label: "Quick Revision Tip", 
        color: "#6366f1",
        icon: "📝",
        prize_type: "digital_reward",
        prize_description: "Get a PDF cheat-sheet.",
        redemption_instructions: ""
      },
      { 
        label: "Try Again", 
        color: "#8b5cf6",
        icon: "❌",
        prize_type: "no_win",
        prize_description: "Keep trying!",
        redemption_instructions: ""
      },
    ],
    wheelColors: { primary: "#8b5cf6", secondary: "#6366f1" },
    leadFormFields: [
      { name: "name", label: "Student Name", type: "text", required: true },
      { name: "custom_field_value", label: "Class", type: "text", required: true },
      { name: "email", label: "Teacher Email", type: "email", required: false },
    ],
  },
  {
    id: "social-games",
    name: "Social Games",
    description: "Movie nights, party games, family fun",
    category: "Entertainment",
    icon: "Film",
    campaignType: "spinwheel",
    wheelSegments: [
      { 
        label: "Pick a Movie", 
        color: "#ec4899",
        icon: "🎬",
        prize_type: "custom",
        prize_description: "Spin decides the movie!",
        redemption_instructions: ""
      },
      { 
        label: "Pick a Game", 
        color: "#f472b6",
        icon: "🎮",
        prize_type: "custom",
        prize_description: "Let the wheel choose your game.",
        redemption_instructions: ""
      },
      { 
        label: "Pick a Snack", 
        color: "#ec4899",
        icon: "🍿",
        prize_type: "custom",
        prize_description: "Snack time decision made easy!",
        redemption_instructions: ""
      },
      { 
        label: "Karaoke Song", 
        color: "#f472b6",
        icon: "🎤",
        prize_type: "custom",
        prize_description: "Your next karaoke hit!",
        redemption_instructions: ""
      },
      { 
        label: "Spin Again", 
        color: "#ec4899",
        icon: "❌",
        prize_type: "custom",
        prize_description: "Try your luck again!",
        redemption_instructions: ""
      },
    ],
    wheelColors: { primary: "#ec4899", secondary: "#f472b6" },
    leadFormFields: [],
  },
  {
    id: "name-picker",
    name: "Name Picker",
    description: "Used for classrooms, raffles, icebreakers",
    category: "Education",
    icon: "Users",
    campaignType: "spinwheel",
    wheelSegments: [
      { 
        label: "Student 1", 
        color: "#14b8a6",
        icon: "👤",
        prize_type: "custom",
        prize_description: "You have been selected! Answer the question shown.",
        redemption_instructions: ""
      },
      { 
        label: "Student 2", 
        color: "#0891b2",
        icon: "👤",
        prize_type: "custom",
        prize_description: "You have been selected! Answer the question shown.",
        redemption_instructions: ""
      },
      { 
        label: "Student 3", 
        color: "#14b8a6",
        icon: "👤",
        prize_type: "custom",
        prize_description: "You have been selected! Answer the question shown.",
        redemption_instructions: ""
      },
      { 
        label: "Student 4", 
        color: "#0891b2",
        icon: "👤",
        prize_type: "custom",
        prize_description: "You have been selected! Answer the question shown.",
        redemption_instructions: ""
      },
      { 
        label: "Student 5", 
        color: "#14b8a6",
        icon: "👤",
        prize_type: "custom",
        prize_description: "You have been selected! Answer the question shown.",
        redemption_instructions: ""
      },
      { 
        label: "Student 6", 
        color: "#0891b2",
        icon: "👤",
        prize_type: "custom",
        prize_description: "You have been selected! Answer the question shown.",
        redemption_instructions: ""
      },
      { 
        label: "Student 7", 
        color: "#14b8a6",
        icon: "👤",
        prize_type: "custom",
        prize_description: "You have been selected! Answer the question shown.",
        redemption_instructions: ""
      },
      { 
        label: "Student 8", 
        color: "#0891b2",
        icon: "👤",
        prize_type: "custom",
        prize_description: "You have been selected! Answer the question shown.",
        redemption_instructions: ""
      },
    ],
    wheelColors: { primary: "#14b8a6", secondary: "#0891b2" },
    leadFormFields: [],
  },
  {
    id: "mega-giveaway",
    name: "Mega Giveaway / Spin & Win",
    description: "Focus on big visuals & prize images",
    category: "Giveaway",
    icon: "Gift",
    campaignType: "spinwheel",
    wheelSegments: [
      { 
        label: "Grand Prize", 
        color: "#f59e0b",
        icon: "🎁",
        prize_type: "hamper",
        prize_description: "Win the grand prize!",
        redemption_instructions: "Contact us to claim your prize."
      },
      { 
        label: "Phone", 
        color: "#ef4444",
        icon: "📱",
        prize_type: "reward",
        prize_description: "Win a brand new smartphone!",
        redemption_instructions: "Contact us to claim your prize."
      },
      { 
        label: "Laptop", 
        color: "#f59e0b",
        icon: "💻",
        prize_type: "reward",
        prize_description: "Win a premium laptop!",
        redemption_instructions: "Contact us to claim your prize."
      },
      { 
        label: "Shopping Voucher", 
        color: "#ef4444",
        icon: "💳",
        prize_type: "coupon",
        prize_description: "Get a shopping voucher!",
        redemption_instructions: "Redeem at participating stores."
      },
      { 
        label: "Gift Hamper", 
        color: "#f59e0b",
        icon: "🎀",
        prize_type: "hamper",
        prize_description: "Win an exclusive gift hamper!",
        redemption_instructions: "Contact us to claim your prize."
      },
      { 
        label: "Try Again", 
        color: "#ef4444",
        icon: "❌",
        prize_type: "no_win",
        prize_description: "Better luck next time!",
        redemption_instructions: ""
      },
    ],
    wheelColors: { primary: "#f59e0b", secondary: "#ef4444" },
    leadFormFields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone Number", type: "tel", required: true },
    ],
  },
  {
    id: "custom-blank",
    name: "Blank Template",
    description: "Start from scratch and customize everything",
    category: "Custom",
    icon: "Wand2",
    campaignType: "spinwheel",
    wheelSegments: [
      { label: "Prize 1", color: "#6366f1" },
      { label: "Prize 2", color: "#8b5cf6" },
      { label: "Prize 3", color: "#6366f1" },
      { label: "Prize 4", color: "#8b5cf6" },
      { label: "Prize 5", color: "#6366f1" },
      { label: "Prize 6", color: "#8b5cf6" },
    ],
    wheelColors: { primary: "#6366f1", secondary: "#8b5cf6" },
    leadFormFields: [
      { name: "email", label: "Email", type: "email", required: true },
    ],
  },

  // Scratch & Win Templates
  {
    id: "christmas-scratch",
    name: "Christmas Scratch Card",
    description: "Festive holiday scratch card for seasonal promotions",
    category: "Seasonal",
    icon: "Gift",
    campaignType: "scratch",
    wheelSegments: [
      {
        label: "🎄 25% Holiday Discount",
        color: "#dc2626",
        icon: "🎄",
        prize_type: "discount",
        prize_description: "Get 25% off your holiday shopping!",
        redemption_instructions: "Use code at checkout before Dec 31st"
      },
      {
        label: "🎁 Free Gift Wrapping",
        color: "#16a34a",
        icon: "🎁",
        prize_type: "free_gift",
        prize_description: "Complimentary gift wrapping on all orders",
        redemption_instructions: "Show this at checkout"
      },
      {
        label: "⭐ $50 Christmas Voucher",
        color: "#dc2626",
        icon: "⭐",
        prize_type: "coupon",
        prize_description: "$50 off on purchases over $200",
        redemption_instructions: "Valid through holiday season"
      },
      {
        label: "🔔 Free Shipping",
        color: "#16a34a",
        icon: "🔔",
        prize_type: "free_shipping",
        prize_description: "Free shipping on your next order",
        redemption_instructions: "Use code within 7 days"
      },
      {
        label: "❌ Try Again",
        color: "#dc2626",
        icon: "❌",
        prize_type: "no_win",
        prize_description: "Better luck next time!",
        redemption_instructions: ""
      },
    ],
    wheelColors: { primary: "#dc2626", secondary: "#16a34a" },
    leadFormFields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
    ],
  },
  {
    id: "instant-discount-scratch",
    name: "Instant Discount Scratch",
    description: "Quick discount reveals for immediate savings",
    category: "Retail",
    icon: "Percent",
    campaignType: "scratch",
    wheelSegments: [
      {
        label: "💰 10% OFF",
        color: "#8b5cf6",
        icon: "💰",
        prize_type: "discount",
        prize_description: "Save 10% on your purchase today",
        redemption_instructions: "Show this at checkout"
      },
      {
        label: "✨ 20% OFF",
        color: "#6366f1",
        icon: "✨",
        prize_type: "discount",
        prize_description: "Get 20% off any item in store",
        redemption_instructions: "Valid for 24 hours"
      },
      {
        label: "🎉 30% OFF",
        color: "#8b5cf6",
        icon: "🎉",
        prize_type: "discount",
        prize_description: "Amazing 30% discount on your order!",
        redemption_instructions: "Use immediately at checkout"
      },
      {
        label: "🌟 15% OFF",
        color: "#6366f1",
        icon: "🌟",
        prize_type: "discount",
        prize_description: "Enjoy 15% off your next purchase",
        redemption_instructions: "Valid for 48 hours"
      },
      {
        label: "❌ No Discount",
        color: "#8b5cf6",
        icon: "❌",
        prize_type: "no_win",
        prize_description: "Not this time, but thanks for playing!",
        redemption_instructions: ""
      },
    ],
    wheelColors: { primary: "#8b5cf6", secondary: "#6366f1" },
    leadFormFields: [
      { name: "email", label: "Email", type: "email", required: true },
    ],
  },
  {
    id: "free-gift-scratch",
    name: "Free Gift Unlock Scratch",
    description: "Reveal surprise free gifts and rewards",
    category: "Rewards",
    icon: "Gift",
    campaignType: "scratch",
    wheelSegments: [
      {
        label: "🎁 Mystery Gift Box",
        color: "#ec4899",
        icon: "🎁",
        prize_type: "free_gift",
        prize_description: "Claim your surprise mystery gift!",
        redemption_instructions: "Visit store to collect your gift"
      },
      {
        label: "☕ Free Coffee Voucher",
        color: "#f43f5e",
        icon: "☕",
        prize_type: "free_gift",
        prize_description: "Enjoy a complimentary coffee on us",
        redemption_instructions: "Valid at any of our locations"
      },
      {
        label: "🍰 Free Dessert",
        color: "#ec4899",
        icon: "🍰",
        prize_type: "free_gift",
        prize_description: "Get a free dessert with your meal",
        redemption_instructions: "Dine-in only, show this voucher"
      },
      {
        label: "🎧 Premium Headphones",
        color: "#f43f5e",
        icon: "🎧",
        prize_type: "free_gift",
        prize_description: "Win wireless headphones!",
        redemption_instructions: "Contact us to claim within 7 days"
      },
      {
        label: "❌ No Prize",
        color: "#ec4899",
        icon: "❌",
        prize_type: "no_win",
        prize_description: "Better luck next time!",
        redemption_instructions: ""
      },
    ],
    wheelColors: { primary: "#ec4899", secondary: "#f43f5e" },
    leadFormFields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "tel", required: true },
    ],
  },
  {
    id: "back-to-school-scratch",
    name: "Back-to-School Scratch",
    description: "Educational rewards and school supplies",
    category: "Education",
    icon: "GraduationCap",
    campaignType: "scratch",
    wheelSegments: [
      {
        label: "📚 20% Off School Supplies",
        color: "#3b82f6",
        icon: "📚",
        prize_type: "discount",
        prize_description: "Save on all school essentials",
        redemption_instructions: "Valid through back-to-school season"
      },
      {
        label: "🎒 Free Backpack",
        color: "#2563eb",
        icon: "🎒",
        prize_type: "free_gift",
        prize_description: "Get a free quality backpack!",
        redemption_instructions: "Collect at store with purchase over $50"
      },
      {
        label: "✏️ Stationery Set",
        color: "#3b82f6",
        icon: "✏️",
        prize_type: "free_gift",
        prize_description: "Complete stationery starter pack",
        redemption_instructions: "Show voucher at checkout"
      },
      {
        label: "📖 $25 Book Voucher",
        color: "#2563eb",
        icon: "📖",
        prize_type: "coupon",
        prize_description: "$25 credit for textbooks or supplies",
        redemption_instructions: "Use code online or in-store"
      },
      {
        label: "❌ Try Again",
        color: "#3b82f6",
        icon: "❌",
        prize_type: "no_win",
        prize_description: "No prize this time!",
        redemption_instructions: ""
      },
    ],
    wheelColors: { primary: "#3b82f6", secondary: "#2563eb" },
    leadFormFields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
    ],
  },
  {
    id: "instant-coupon-scratch",
    name: "Instant Coupon Reveal Scratch",
    description: "Reveal exclusive coupon codes instantly",
    category: "Marketing",
    icon: "Ticket",
    campaignType: "scratch",
    wheelSegments: [
      {
        label: "💳 $10 OFF Coupon",
        color: "#f59e0b",
        icon: "💳",
        prize_type: "coupon",
        prize_description: "$10 discount on orders over $50",
        redemption_instructions: "Enter code at online checkout"
      },
      {
        label: "🎫 $25 OFF Coupon",
        color: "#d97706",
        icon: "🎫",
        prize_type: "coupon",
        prize_description: "$25 off on purchases above $100",
        redemption_instructions: "Valid for 30 days"
      },
      {
        label: "💎 $50 OFF Coupon",
        color: "#f59e0b",
        icon: "💎",
        prize_type: "coupon",
        prize_description: "Save $50 on orders over $200!",
        redemption_instructions: "Show at checkout or use code online"
      },
      {
        label: "⚡ 15% OFF Coupon",
        color: "#d97706",
        icon: "⚡",
        prize_type: "coupon",
        prize_description: "Get 15% off everything",
        redemption_instructions: "Use within 14 days"
      },
      {
        label: "❌ No Coupon",
        color: "#f59e0b",
        icon: "❌",
        prize_type: "no_win",
        prize_description: "Not a winner this time!",
        redemption_instructions: ""
      },
    ],
    wheelColors: { primary: "#f59e0b", secondary: "#d97706" },
    leadFormFields: [
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "tel", required: false },
    ],
  },
];
