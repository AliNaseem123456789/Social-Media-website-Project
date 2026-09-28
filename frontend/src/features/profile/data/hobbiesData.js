export const HOBBY_CATEGORIES = {
  Sports: [
    "Cricket", "Football", "Basketball", "Tennis", "Badminton", "Table Tennis",
    "Volleyball", "Baseball", "Rugby", "Golf", "Swimming", "Cycling", "Running",
    "Hiking", "Boxing", "Martial Arts", "Skateboarding", "Surfing", "Skiing",
    "Snowboarding", "Rock Climbing", "Yoga", "Gym & Fitness", "CrossFit",
  ],
  Music: [
    "Playing Guitar", "Playing Piano", "Singing", "Songwriting", "DJing",
    "Music Production", "Drumming", "Playing Violin", "Listening to Music",
  ],
  "Arts & Creativity": [
    "Painting", "Drawing", "Sketching", "Photography", "Videography",
    "Sculpting", "Calligraphy", "Graphic Design", "Pottery", "Knitting",
    "Sewing", "Crafting",
  ],
  "Reading & Writing": ["Reading", "Creative Writing", "Poetry", "Blogging", "Journaling"],
  Gaming: ["Video Gaming", "Board Games", "Chess", "Card Games", "Puzzle Solving"],
  "Outdoors & Travel": [
    "Traveling", "Camping", "Fishing", "Gardening", "Bird Watching",
    "Backpacking", "Road Trips",
  ],
  "Food & Drink": ["Cooking", "Baking", "Wine Tasting", "Coffee Brewing", "Grilling & BBQ"],
  "Tech & Learning": [
    "Coding", "Robotics", "3D Printing", "Learning Languages", "Investing", "Astronomy",
  ],
  "Performing Arts": ["Dancing", "Acting", "Theatre", "Stand-up Comedy"],
  "Social & Lifestyle": [
    "Volunteering", "Meditation", "Podcasting", "Fashion & Styling", "Collecting",
  ],
};

export const HOBBIES = Object.entries(HOBBY_CATEGORIES).flatMap(([category, items]) =>
  items.map((label) => ({ label, category }))
);
