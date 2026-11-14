/* KPR Fitness — the built-in exercise library.

   X(name, muscle, equipment, category, track, secondary, steps, tip)
     muscle     the main muscle worked (a key of MUSCLES)
     equipment  a key of EQUIPMENT
     category   a key of CATEGORIES
     track      how a set is logged:
                  wr  weight × reps        r   reps (bodyweight, optional added weight)
                  t   time (seconds)       dt  distance + time
     secondary  other muscles it works
     steps      how to do it, steps split by "|"
     tip        one coaching cue

   An exercise's id is its name in lower-case-with-dashes, so it never
   changes once workouts point at it. Add new ones anywhere; never rename. */
(function () {
  "use strict";

  const MUSCLES = {
    chest: "Chest", back: "Back", traps: "Traps", shoulders: "Shoulders",
    biceps: "Biceps", triceps: "Triceps", forearms: "Forearms",
    abs: "Abs", obliques: "Obliques", lowerback: "Lower back",
    glutes: "Glutes", quads: "Quads", hamstrings: "Hamstrings", calves: "Calves",
    adductors: "Adductors", abductors: "Hips", neck: "Neck",
    fullbody: "Full body", cardio: "Heart & lungs",
  };
  const EQUIPMENT = {
    barbell: "Barbell", dumbbell: "Dumbbell", kettlebell: "Kettlebell", machine: "Machine",
    cable: "Cable", smith: "Smith machine", ezbar: "EZ bar", bodyweight: "Bodyweight",
    band: "Band", pullupbar: "Pull-up bar", bench: "Bench", medball: "Medicine ball",
    trx: "Suspension trainer", cardio: "Cardio machine", rope: "Jump rope", box: "Box / step",
    foamroller: "Foam roller", mat: "Mat", other: "Other",
  };
  const CATEGORIES = {
    strength: "Strength", calisthenics: "Bodyweight", cardio: "Cardio", hiit: "HIIT",
    plyometrics: "Plyometrics", olympic: "Olympic lifts", stretching: "Stretching",
    yoga: "Yoga", mobility: "Mobility", core: "Core",
  };
  const TRACKS = { wr: "Weight × reps", r: "Reps", t: "Time", dt: "Distance + time" };

  const LIST = [];
  const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  function X(name, muscle, equipment, category, track, secondary, steps, tip) {
    LIST.push({ id: slug(name), name, muscle, equipment, category, track, secondary: secondary || [], steps: (steps || "").split("|").filter(Boolean), tip: tip || "", builtin: true });
  }

  // ---------------------------------------------------------------- Chest
  X("Barbell Bench Press", "chest", "barbell", "strength", "wr", ["triceps", "shoulders"],
    "Lie on a flat bench with your eyes under the bar.|Grip a little wider than your shoulders and unrack with straight arms.|Lower the bar to your mid-chest, elbows about 45° from your body.|Press up and slightly back to lockout.",
    "Keep your feet planted and shoulder blades squeezed together the whole set.");
  X("Incline Barbell Bench Press", "chest", "barbell", "strength", "wr", ["shoulders", "triceps"],
    "Set the bench to 30–45°.|Unrack with straight arms over your upper chest.|Lower to just under your collarbones.|Press straight up to lockout.",
    "A lower incline keeps the work on the chest instead of the shoulders.");
  X("Decline Barbell Bench Press", "chest", "barbell", "strength", "wr", ["triceps"],
    "Hook your legs on a decline bench.|Unrack over your lower chest.|Lower to the bottom of your chest.|Press back up.",
    "Use a spotter: re-racking from a decline is awkward.");
  X("Close-Grip Bench Press", "triceps", "barbell", "strength", "wr", ["chest", "shoulders"],
    "Lie on a flat bench and grip the bar about shoulder-width.|Lower to your lower chest, elbows tucked.|Press up until your arms are straight.",
    "Hands too close strains the wrists — shoulder-width is enough.");
  X("Dumbbell Bench Press", "chest", "dumbbell", "strength", "wr", ["triceps", "shoulders"],
    "Sit with dumbbells on your thighs, then lie back and bring them over your chest.|Lower until your elbows are just below the bench.|Press up, bringing the dumbbells together at the top.",
    "Dumbbells let each arm work alone and fix imbalances.");
  X("Incline Dumbbell Press", "chest", "dumbbell", "strength", "wr", ["shoulders", "triceps"],
    "Set the bench to 30–45° and lie back with the dumbbells over your upper chest.|Lower with control, elbows slightly tucked.|Press up and in.",
    "Pause for a moment at the bottom for a deeper stretch.");
  X("Dumbbell Fly", "chest", "dumbbell", "strength", "wr", ["shoulders"],
    "Lie on a flat bench, dumbbells above your chest, palms facing.|With a slight bend in your elbows, open your arms in a wide arc.|Stop at chest level, then squeeze them back together.",
    "Think of hugging a big tree; the elbow angle stays fixed.");
  X("Incline Dumbbell Fly", "chest", "dumbbell", "strength", "wr", ["shoulders"],
    "Lie on a 30° incline, dumbbells above your chest.|Open your arms in a wide arc with soft elbows.|Bring them back together over your upper chest.",
    "Go lighter than flat flys.");
  X("Cable Crossover", "chest", "cable", "strength", "wr", ["shoulders"],
    "Set both pulleys high and take a handle in each hand.|Step forward, lean slightly, elbows soft.|Pull the handles down and together in front of your hips.|Return slowly.",
    "Cross your hands at the end for a stronger squeeze.");
  X("Low-to-High Cable Fly", "chest", "cable", "strength", "wr", ["shoulders"],
    "Set both pulleys low.|Pull the handles up and together to shoulder height.|Lower slowly.",
    "Targets the upper chest.");
  X("Machine Chest Press", "chest", "machine", "strength", "wr", ["triceps", "shoulders"],
    "Set the seat so the handles line up with your mid-chest.|Press forward until your arms are nearly straight.|Return slowly without letting the weight stack touch.",
    "A good way to train close to failure safely.");
  X("Pec Deck", "chest", "machine", "strength", "wr", ["shoulders"],
    "Sit with your back flat and arms on the pads or handles.|Bring your arms together in front of you.|Open slowly until you feel a stretch.",
    "Keep your shoulders down, away from your ears.");
  X("Push-Up", "chest", "bodyweight", "calisthenics", "r", ["triceps", "shoulders", "abs"],
    "Start in a high plank, hands a little wider than your shoulders.|Lower until your chest is just above the floor.|Push back up, keeping a straight line from head to heels.",
    "Squeeze your glutes so your hips don't sag.");
  X("Incline Push-Up", "chest", "bodyweight", "calisthenics", "r", ["triceps", "shoulders"],
    "Put your hands on a bench or counter.|Lower your chest to the edge.|Push back up.",
    "The higher the surface, the easier it is — a great place to start.");
  X("Decline Push-Up", "chest", "bodyweight", "calisthenics", "r", ["shoulders", "triceps"],
    "Put your feet on a bench and hands on the floor.|Lower your chest to the floor.|Push back up.",
    "Works the upper chest and shoulders more.");
  X("Diamond Push-Up", "triceps", "bodyweight", "calisthenics", "r", ["chest"],
    "Make a diamond with your thumbs and index fingers under your chest.|Lower until your chest touches your hands.|Push back up.",
    "Keep elbows close to your sides.");
  X("Wide Push-Up", "chest", "bodyweight", "calisthenics", "r", ["shoulders"],
    "Set your hands well outside your shoulders.|Lower your chest to the floor.|Push back up.",
    "Don't go so wide that your shoulders hurt.");
  X("Chest Dip", "chest", "bodyweight", "calisthenics", "r", ["triceps", "shoulders"],
    "Hold the dip bars with straight arms.|Lean your body forward.|Lower until your shoulders are just below your elbows.|Press back up.",
    "Leaning forward shifts the work to the chest.");
  X("Svend Press", "chest", "other", "strength", "wr", ["shoulders"],
    "Squeeze two weight plates together in front of your chest.|Press them straight out.|Bring them back, squeezing hard the whole time.",
    "The squeeze is the exercise — don't let the plates slip.");

  // ---------------------------------------------------------------- Back
  X("Deadlift", "back", "barbell", "strength", "wr", ["hamstrings", "glutes", "lowerback", "traps", "forearms"],
    "Stand with the bar over your mid-foot, feet hip-width.|Hinge and grip just outside your legs.|Brace, flatten your back and pull the slack out of the bar.|Push the floor away and stand up tall.|Lower by pushing your hips back.",
    "Keep the bar touching your legs all the way up.");
  X("Sumo Deadlift", "glutes", "barbell", "strength", "wr", ["adductors", "quads", "back"],
    "Stand wide with toes turned out, bar over mid-foot.|Grip inside your knees with straight arms.|Push your knees out and stand up.|Lower under control.",
    "Chest up, knees tracking over your toes.");
  X("Trap Bar Deadlift", "quads", "other", "strength", "wr", ["glutes", "hamstrings", "back", "traps"],
    "Stand in the middle of the trap bar.|Grip the handles, brace and keep your chest up.|Drive through your feet to stand.|Lower with control.",
    "Easier on the lower back than a straight bar.");
  X("Pull-Up", "back", "pullupbar", "calisthenics", "r", ["biceps", "forearms"],
    "Hang from the bar with an overhand grip a little wider than shoulders.|Pull your elbows down until your chin is over the bar.|Lower all the way down.",
    "Start each rep by pulling your shoulder blades down.");
  X("Chin-Up", "back", "pullupbar", "calisthenics", "r", ["biceps"],
    "Hang with an underhand grip, shoulder-width.|Pull until your chin passes the bar.|Lower slowly.",
    "Usually easier than pull-ups — more biceps.");
  X("Neutral-Grip Pull-Up", "back", "pullupbar", "calisthenics", "r", ["biceps", "forearms"],
    "Hang from parallel handles, palms facing.|Pull your chest toward the handles.|Lower all the way.",
    "Kindest grip for the shoulders and elbows.");
  X("Assisted Pull-Up", "back", "machine", "strength", "wr", ["biceps"],
    "Kneel or stand on the platform and set the assistance.|Pull until your chin is over the bar.|Lower slowly.",
    "Log the assistance as the weight; less is harder.");
  X("Lat Pulldown", "back", "cable", "strength", "wr", ["biceps"],
    "Sit with your thighs under the pads, grip the bar wide.|Pull the bar to your upper chest, elbows down and back.|Let it rise slowly until your arms are straight.",
    "Lean back only slightly; don't swing.");
  X("Close-Grip Lat Pulldown", "back", "cable", "strength", "wr", ["biceps"],
    "Attach a V-handle and sit under the pads.|Pull the handle to your upper chest.|Return slowly.",
    "Drive your elbows to your hips.");
  X("Straight-Arm Pulldown", "back", "cable", "strength", "wr", ["triceps"],
    "Stand facing a high pulley with a bar or rope.|With straight arms, pull the bar down to your thighs.|Let it rise to eye level.",
    "Hinge forward slightly and keep your arms locked.");
  X("Barbell Row", "back", "barbell", "strength", "wr", ["biceps", "lowerback", "traps"],
    "Hinge until your torso is about 45° with the bar hanging at your knees.|Pull the bar to your lower ribs.|Lower until your arms are straight.",
    "Keep your back flat and don't jerk the weight up.");
  X("Pendlay Row", "back", "barbell", "strength", "wr", ["biceps", "traps"],
    "Hinge until your torso is level with the floor, bar on the ground.|Row the bar explosively to your chest.|Set it back down each rep.",
    "Each rep starts from a dead stop.");
  X("T-Bar Row", "back", "barbell", "strength", "wr", ["biceps", "traps"],
    "Straddle the bar with a V-handle under it.|Hinge and row the plates to your chest.|Lower with control.",
    "Keep your chest up.");
  X("Dumbbell Row", "back", "dumbbell", "strength", "wr", ["biceps"],
    "Put one hand and knee on a bench, dumbbell in the other hand.|Row the dumbbell to your hip.|Lower until your arm is straight.",
    "Pull toward your hip, not your armpit.");
  X("Chest-Supported Row", "back", "dumbbell", "strength", "wr", ["biceps", "traps"],
    "Lie face down on an incline bench with dumbbells hanging.|Row both dumbbells up, squeezing your shoulder blades.|Lower slowly.",
    "No lower-back strain, so you can focus on the squeeze.");
  X("Seated Cable Row", "back", "cable", "strength", "wr", ["biceps", "traps"],
    "Sit with your feet on the platform and knees soft.|Pull the handle to your stomach.|Let your arms go straight, keeping your back tall.",
    "Don't rock back and forth.");
  X("Machine Row", "back", "machine", "strength", "wr", ["biceps"],
    "Sit with your chest on the pad.|Pull the handles back.|Return slowly.",
    "Pause and squeeze at the back.");
  X("Inverted Row", "back", "bodyweight", "calisthenics", "r", ["biceps"],
    "Lie under a bar set at hip height, holding it with straight arms.|Keep your body straight and pull your chest to the bar.|Lower slowly.",
    "Bend your knees to make it easier.");
  X("TRX Row", "back", "trx", "calisthenics", "r", ["biceps"],
    "Hold the handles and lean back with straight arms.|Pull your chest to your hands.|Lower slowly.",
    "Walk your feet forward to make it harder.");
  X("Face Pull", "shoulders", "cable", "strength", "wr", ["traps", "back"],
    "Set a rope at face height.|Pull it toward your face, hands apart, elbows high.|Return slowly.",
    "Great for posture and healthy shoulders.");
  X("Good Morning", "hamstrings", "barbell", "strength", "wr", ["lowerback", "glutes"],
    "Rest a bar on your upper back.|With soft knees, hinge forward until your torso is near level.|Stand back up.",
    "Start light; keep your back flat.");
  X("Back Extension", "lowerback", "bench", "strength", "r", ["glutes", "hamstrings"],
    "Set yourself in a back extension bench, hips on the pad.|Lower your torso toward the floor.|Raise it until your body is straight.",
    "Hold a plate to your chest to make it harder.");
  X("Superman", "lowerback", "bodyweight", "core", "r", ["glutes"],
    "Lie face down, arms overhead.|Lift your arms, chest and legs off the floor.|Hold for a moment and lower.",
    "Look at the floor to keep your neck neutral.");

  // ---------------------------------------------------------------- Traps
  X("Barbell Shrug", "traps", "barbell", "strength", "wr", ["forearms"],
    "Hold a barbell in front of your thighs.|Shrug your shoulders straight up toward your ears.|Hold a second and lower.",
    "Don't roll your shoulders — straight up and down.");
  X("Dumbbell Shrug", "traps", "dumbbell", "strength", "wr", ["forearms"],
    "Hold dumbbells at your sides.|Shrug straight up.|Lower slowly.",
    "Pause at the top.");
  X("Farmer's Carry", "forearms", "dumbbell", "strength", "dt", ["traps", "abs", "fullbody"],
    "Pick up heavy dumbbells or kettlebells.|Walk with tall posture and short steps.|Put them down when your grip gives out.",
    "Log the distance and time.");
  X("Rack Pull", "back", "barbell", "strength", "wr", ["traps", "glutes", "forearms"],
    "Set the bar on pins at knee height.|Grip, brace and stand up.|Lower back to the pins.",
    "Lets you handle heavier weight for the top of the deadlift.");

  // ---------------------------------------------------------------- Shoulders
  X("Overhead Press", "shoulders", "barbell", "strength", "wr", ["triceps", "traps", "abs"],
    "Stand with the bar on your front shoulders, grip just wider than shoulders.|Brace and press straight up, moving your head back out of the way.|Lock out overhead with the bar over your mid-foot.|Lower to your shoulders.",
    "Squeeze your glutes so your lower back doesn't arch.");
  X("Seated Dumbbell Press", "shoulders", "dumbbell", "strength", "wr", ["triceps"],
    "Sit on an upright bench, dumbbells at shoulder height.|Press them overhead until your arms are straight.|Lower to ear height.",
    "Keep your back against the pad.");
  X("Arnold Press", "shoulders", "dumbbell", "strength", "wr", ["triceps"],
    "Start with dumbbells in front of your shoulders, palms facing you.|Press up while turning your palms forward.|Reverse on the way down.",
    "The twist works more of the shoulder.");
  X("Push Press", "shoulders", "barbell", "olympic", "wr", ["triceps", "quads"],
    "Bar on your front shoulders.|Dip your knees slightly then drive up.|Use that drive to press the bar overhead.",
    "The dip is short and straight down.");
  X("Machine Shoulder Press", "shoulders", "machine", "strength", "wr", ["triceps"],
    "Set the seat so the handles start at shoulder height.|Press up until your arms are straight.|Lower slowly.",
    "Safe to push near failure.");
  X("Lateral Raise", "shoulders", "dumbbell", "strength", "wr", [],
    "Stand with dumbbells at your sides.|Raise them out to shoulder height, elbows soft.|Lower slowly.",
    "Lead with your elbows; light weight, strict form.");
  X("Cable Lateral Raise", "shoulders", "cable", "strength", "wr", [],
    "Stand side-on to a low pulley, handle in the far hand.|Raise your arm out to shoulder height.|Lower slowly.",
    "The cable keeps tension at the bottom.");
  X("Front Raise", "shoulders", "dumbbell", "strength", "wr", ["chest"],
    "Hold dumbbells in front of your thighs.|Raise them forward to shoulder height.|Lower slowly.",
    "No swinging.");
  X("Rear Delt Fly", "shoulders", "dumbbell", "strength", "wr", ["back", "traps"],
    "Hinge forward with dumbbells hanging under your chest.|Raise them out to the sides, elbows soft.|Lower slowly.",
    "Squeeze the back of your shoulders, not your shoulder blades.");
  X("Reverse Pec Deck", "shoulders", "machine", "strength", "wr", ["back"],
    "Sit facing the pec deck pad.|Push the handles back in a wide arc.|Return slowly.",
    "Keep your chest on the pad.");
  X("Upright Row", "shoulders", "barbell", "strength", "wr", ["traps", "biceps"],
    "Hold a bar in front of your thighs, hands shoulder-width.|Pull it up to mid-chest, elbows high.|Lower slowly.",
    "Stop at chest height to spare your shoulders.");
  X("Pike Push-Up", "shoulders", "bodyweight", "calisthenics", "r", ["triceps"],
    "Start in a pike: hips high, hands and feet on the floor.|Bend your elbows to bring your head toward the floor.|Push back up.",
    "Feet on a box makes it harder.");
  X("Handstand Push-Up", "shoulders", "bodyweight", "calisthenics", "r", ["triceps", "traps"],
    "Kick up into a handstand against a wall.|Lower until your head nearly touches the floor.|Press back up.",
    "Advanced — master pike push-ups first.");
  X("Band Pull-Apart", "shoulders", "band", "mobility", "r", ["back", "traps"],
    "Hold a band at chest height with straight arms.|Pull it apart until it touches your chest.|Return slowly.",
    "A great warm-up for any upper-body day.");
  X("Landmine Press", "shoulders", "barbell", "strength", "wr", ["chest", "triceps"],
    "Hold the end of a landmine bar at your shoulder.|Press it up and forward.|Lower with control.",
    "Easy on shoulders that don't like pressing straight up.");

  // ---------------------------------------------------------------- Biceps
  X("Barbell Curl", "biceps", "barbell", "strength", "wr", ["forearms"],
    "Stand holding the bar with an underhand grip, shoulder-width.|Curl it up, keeping your elbows at your sides.|Lower slowly.",
    "No swinging — the lower is half the work.");
  X("EZ-Bar Curl", "biceps", "ezbar", "strength", "wr", ["forearms"],
    "Hold the EZ bar on the angled grips.|Curl it to your shoulders.|Lower slowly.",
    "Easier on the wrists than a straight bar.");
  X("Dumbbell Curl", "biceps", "dumbbell", "strength", "wr", ["forearms"],
    "Stand with dumbbells at your sides, palms forward.|Curl them up, elbows still.|Lower slowly.",
    "Squeeze at the top.");
  X("Hammer Curl", "biceps", "dumbbell", "strength", "wr", ["forearms"],
    "Hold dumbbells with palms facing each other.|Curl up, keeping your palms facing in.|Lower slowly.",
    "Builds the forearms and arm thickness too.");
  X("Incline Dumbbell Curl", "biceps", "dumbbell", "strength", "wr", [],
    "Lie back on a 45° bench, arms hanging.|Curl the dumbbells up.|Lower all the way.",
    "The stretch at the bottom is the point.");
  X("Preacher Curl", "biceps", "ezbar", "strength", "wr", [],
    "Sit at a preacher bench, arms on the pad.|Curl the bar up.|Lower until your arms are almost straight.",
    "Don't drop into the bottom.");
  X("Concentration Curl", "biceps", "dumbbell", "strength", "wr", [],
    "Sit and rest your elbow against the inside of your thigh.|Curl the dumbbell up.|Lower slowly.",
    "Turn your little finger up at the top.");
  X("Cable Curl", "biceps", "cable", "strength", "wr", ["forearms"],
    "Stand facing a low pulley with a bar.|Curl the bar up.|Lower slowly.",
    "Constant tension from bottom to top.");
  X("Spider Curl", "biceps", "dumbbell", "strength", "wr", [],
    "Lie chest-down on an incline bench, arms hanging.|Curl the dumbbells up.|Lower slowly.",
    "Your elbows can't cheat here.");

  // ---------------------------------------------------------------- Triceps
  X("Triceps Pushdown", "triceps", "cable", "strength", "wr", [],
    "Stand at a high pulley with a bar or rope.|With elbows pinned to your sides, push down until your arms are straight.|Let it rise to chest height.",
    "Only your forearms move.");
  X("Rope Pushdown", "triceps", "cable", "strength", "wr", [],
    "Hold a rope at a high pulley.|Push down and spread the ends apart at the bottom.|Return slowly.",
    "Spread the rope for a stronger squeeze.");
  X("Overhead Triceps Extension", "triceps", "dumbbell", "strength", "wr", [],
    "Hold one dumbbell overhead with both hands.|Lower it behind your head.|Straighten your arms.",
    "Keep your elbows pointing forward.");
  X("Cable Overhead Extension", "triceps", "cable", "strength", "wr", [],
    "Face away from a pulley holding a rope behind your head.|Extend your arms forward and up.|Return slowly.",
    "Big stretch on the long head of the triceps.");
  X("Skull Crusher", "triceps", "ezbar", "strength", "wr", [],
    "Lie on a bench with the bar over your chest.|Bend your elbows to lower it to your forehead.|Straighten your arms.",
    "Lower to just behind your head to keep tension.");
  X("Triceps Dip", "triceps", "bodyweight", "calisthenics", "r", ["chest", "shoulders"],
    "Hold the dip bars with your body upright.|Lower until your elbows are at 90°.|Press back up.",
    "Stay upright to keep it on the triceps.");
  X("Bench Dip", "triceps", "bench", "calisthenics", "r", ["shoulders"],
    "Sit on a bench edge, hands next to your hips.|Slide off and lower by bending your elbows.|Press back up.",
    "Keep your back close to the bench.");
  X("Triceps Kickback", "triceps", "dumbbell", "strength", "wr", [],
    "Hinge forward, upper arm level with your body.|Straighten your arm behind you.|Bend back slowly.",
    "Light weight — your upper arm stays still.");

  // ---------------------------------------------------------------- Forearms
  X("Wrist Curl", "forearms", "dumbbell", "strength", "wr", [],
    "Rest your forearms on a bench, palms up.|Curl the weight up with your wrists.|Lower slowly.",
    "Small range, lots of reps.");
  X("Reverse Wrist Curl", "forearms", "dumbbell", "strength", "wr", [],
    "Rest your forearms on a bench, palms down.|Lift the weight with your wrists.|Lower slowly.",
    "Go light.");
  X("Reverse Curl", "forearms", "barbell", "strength", "wr", ["biceps"],
    "Hold a bar with an overhand grip.|Curl it up.|Lower slowly.",
    "Builds the top of your forearms.");
  X("Dead Hang", "forearms", "pullupbar", "calisthenics", "t", ["back", "shoulders"],
    "Grip a pull-up bar.|Hang with straight arms and relaxed shoulders.|Hold as long as you can.",
    "Great for grip and decompressing the spine.");
  X("Plate Pinch", "forearms", "other", "strength", "t", [],
    "Pinch two plates together, smooth side out.|Hold them at your side.|Hold for time.",
    "Builds a strong pinch grip.");

  // ---------------------------------------------------------------- Legs
  X("Back Squat", "quads", "barbell", "strength", "wr", ["glutes", "hamstrings", "lowerback", "abs"],
    "Rest the bar on your upper back, feet shoulder-width.|Brace and sit down between your heels.|Go until your hips are at or below your knees.|Drive up through your whole foot.",
    "Knees follow your toes; chest stays up.");
  X("Front Squat", "quads", "barbell", "strength", "wr", ["glutes", "abs"],
    "Rest the bar on your front shoulders, elbows high.|Squat straight down.|Stand back up.",
    "Elbows up keeps the bar from rolling forward.");
  X("Goblet Squat", "quads", "dumbbell", "strength", "wr", ["glutes", "abs"],
    "Hold a dumbbell or kettlebell at your chest.|Squat down between your knees.|Stand up.",
    "The best way to learn the squat.");
  X("Box Squat", "quads", "barbell", "strength", "wr", ["glutes", "hamstrings"],
    "Set a box behind you at about knee height.|Squat back until you sit lightly on it.|Drive back up.",
    "Sit, don't crash.");
  X("Hack Squat", "quads", "machine", "strength", "wr", ["glutes"],
    "Stand on the platform with your back on the pad.|Lower until your thighs are level.|Push back up.",
    "Feet lower on the platform works the quads more.");
  X("Leg Press", "quads", "machine", "strength", "wr", ["glutes", "hamstrings"],
    "Sit with your feet shoulder-width on the platform.|Lower until your knees are near your chest.|Press back up without locking your knees.",
    "Keep your lower back on the seat.");
  X("Smith Machine Squat", "quads", "smith", "strength", "wr", ["glutes"],
    "Set the bar on your upper back, feet slightly in front.|Squat down.|Press back up.",
    "Feet forward takes stress off the knees.");
  X("Bodyweight Squat", "quads", "bodyweight", "calisthenics", "r", ["glutes"],
    "Stand with feet shoulder-width.|Sit down as low as you can with your chest up.|Stand back up.",
    "Reach your arms forward for balance.");
  X("Bulgarian Split Squat", "quads", "dumbbell", "strength", "wr", ["glutes", "hamstrings"],
    "Rest your back foot on a bench.|Lower your back knee toward the floor.|Push up through your front foot.",
    "Lean forward a little for more glutes.");
  X("Walking Lunge", "quads", "dumbbell", "strength", "wr", ["glutes", "hamstrings"],
    "Step forward and lower your back knee near the floor.|Push through your front foot to step into the next lunge.|Keep going.",
    "Long steps hit the glutes; short steps hit the quads.");
  X("Reverse Lunge", "quads", "dumbbell", "strength", "wr", ["glutes"],
    "Step back and lower your back knee.|Push through the front foot to stand.|Switch legs.",
    "Easier on the knees than forward lunges.");
  X("Lateral Lunge", "adductors", "bodyweight", "calisthenics", "r", ["quads", "glutes"],
    "Step wide to one side.|Sit back into that hip, other leg straight.|Push back to the middle.",
    "Keep both feet flat.");
  X("Step-Up", "quads", "box", "strength", "wr", ["glutes"],
    "Stand facing a box or bench.|Step up with one foot and stand tall.|Step down slowly.",
    "Drive through the top foot — don't push off the bottom one.");
  X("Pistol Squat", "quads", "bodyweight", "calisthenics", "r", ["glutes", "abs"],
    "Stand on one leg, other leg straight in front.|Squat all the way down on one leg.|Stand back up.",
    "Hold onto something until you're strong enough.");
  X("Wall Sit", "quads", "bodyweight", "calisthenics", "t", ["glutes"],
    "Lean your back against a wall.|Slide down until your thighs are level.|Hold.",
    "Keep your knees over your ankles.");
  X("Leg Extension", "quads", "machine", "strength", "wr", [],
    "Sit with your shins under the pad.|Straighten your legs.|Lower slowly.",
    "Squeeze at the top for a second.");
  X("Sissy Squat", "quads", "bodyweight", "calisthenics", "r", [],
    "Hold something for balance and rise onto your toes.|Lean back and bend your knees forward.|Return to standing.",
    "Advanced — go slowly.");
  X("Romanian Deadlift", "hamstrings", "barbell", "strength", "wr", ["glutes", "lowerback"],
    "Hold the bar at your hips.|With soft knees, push your hips back and slide the bar down your thighs.|Stop when you feel a strong stretch, then stand up.",
    "It's a hip hinge, not a squat.");
  X("Dumbbell Romanian Deadlift", "hamstrings", "dumbbell", "strength", "wr", ["glutes"],
    "Hold dumbbells in front of your thighs.|Hinge at the hips with soft knees.|Stand back up.",
    "Keep the dumbbells close to your legs.");
  X("Single-Leg Romanian Deadlift", "hamstrings", "dumbbell", "strength", "wr", ["glutes", "abs"],
    "Stand on one leg with a dumbbell in the opposite hand.|Hinge forward as your back leg rises.|Return to standing.",
    "Hips stay level — don't open them.");
  X("Stiff-Leg Deadlift", "hamstrings", "barbell", "strength", "wr", ["lowerback", "glutes"],
    "Stand with nearly straight legs holding a bar.|Hinge forward to lower it toward the floor.|Stand back up.",
    "Lighter than a Romanian deadlift.");
  X("Lying Leg Curl", "hamstrings", "machine", "strength", "wr", ["calves"],
    "Lie face down with the pad behind your ankles.|Curl your heels toward your glutes.|Lower slowly.",
    "Keep your hips down on the bench.");
  X("Seated Leg Curl", "hamstrings", "machine", "strength", "wr", [],
    "Sit with the pad behind your ankles.|Curl your legs down and back.|Return slowly.",
    "Lean forward a bit for a better stretch.");
  X("Nordic Curl", "hamstrings", "bodyweight", "calisthenics", "r", [],
    "Kneel with your ankles held down.|Lower your body forward as slowly as you can.|Catch yourself and push back up.",
    "One of the best ways to prevent hamstring injuries.");
  X("Glute-Ham Raise", "hamstrings", "machine", "strength", "r", ["glutes", "calves"],
    "Set your feet in the GHD with knees just behind the pad.|Lower your body until it's level.|Curl yourself back up with your hamstrings.",
    "Hard — use your hands to help at first.");
  X("Hip Thrust", "glutes", "barbell", "strength", "wr", ["hamstrings"],
    "Sit with your upper back against a bench, bar over your hips.|Drive your hips up until your body is level.|Lower slowly.",
    "Tuck your chin and squeeze at the top.");
  X("Glute Bridge", "glutes", "bodyweight", "calisthenics", "r", ["hamstrings"],
    "Lie on your back, knees bent, feet flat.|Lift your hips until your body is straight.|Lower slowly.",
    "Push through your heels.");
  X("Single-Leg Glute Bridge", "glutes", "bodyweight", "calisthenics", "r", ["hamstrings"],
    "Lie on your back with one foot flat and the other leg straight.|Lift your hips.|Lower slowly.",
    "Keep your hips level.");
  X("Cable Kickback", "glutes", "cable", "strength", "wr", ["hamstrings"],
    "Attach an ankle strap at a low pulley.|Kick your leg straight back.|Return slowly.",
    "Don't arch your lower back.");
  X("Hip Abduction Machine", "abductors", "machine", "strength", "wr", ["glutes"],
    "Sit with the pads outside your knees.|Push your knees apart.|Return slowly.",
    "Lean forward slightly for more glutes.");
  X("Hip Adduction Machine", "adductors", "machine", "strength", "wr", [],
    "Sit with the pads inside your knees.|Squeeze your legs together.|Return slowly.",
    "Control the opening.");
  X("Banded Lateral Walk", "abductors", "band", "strength", "r", ["glutes"],
    "Put a band around your knees or ankles.|Squat a little and step sideways.|Keep tension on the band.",
    "Toes point forward.");
  X("Clamshell", "abductors", "band", "mobility", "r", ["glutes"],
    "Lie on your side with knees bent, band over your knees.|Open your top knee, feet together.|Close slowly.",
    "Don't roll your hips back.");
  X("Kettlebell Swing", "glutes", "kettlebell", "strength", "wr", ["hamstrings", "lowerback", "shoulders"],
    "Stand with the kettlebell a step in front of you.|Hike it back between your legs.|Snap your hips forward to swing it to chest height.|Let it fall back and repeat.",
    "Power comes from your hips, not your arms.");
  X("Standing Calf Raise", "calves", "machine", "strength", "wr", [],
    "Stand on the edge of a step with your heels hanging.|Rise as high as you can on your toes.|Lower until you feel a stretch.",
    "Pause at the top and the bottom.");
  X("Seated Calf Raise", "calves", "machine", "strength", "wr", [],
    "Sit with the pad on your knees and the balls of your feet on the step.|Raise your heels.|Lower slowly.",
    "Works the lower calf muscle.");
  X("Single-Leg Calf Raise", "calves", "bodyweight", "calisthenics", "r", [],
    "Stand on one foot on a step.|Rise onto your toes.|Lower slowly.",
    "Hold a dumbbell to make it harder.");
  X("Tibialis Raise", "calves", "bodyweight", "calisthenics", "r", [],
    "Lean your back on a wall, heels a foot away.|Lift your toes toward your shins.|Lower slowly.",
    "Builds the front of the shins.");

  // ---------------------------------------------------------------- Core
  X("Plank", "abs", "bodyweight", "core", "t", ["obliques", "shoulders"],
    "Rest on your forearms and toes.|Keep a straight line from head to heels.|Hold.",
    "Squeeze your glutes and brace like you're about to be punched.");
  X("Side Plank", "obliques", "bodyweight", "core", "t", ["abs", "abductors"],
    "Lie on your side and prop up on one forearm.|Lift your hips into a straight line.|Hold, then switch sides.",
    "Don't let your hips sag.");
  X("Crunch", "abs", "bodyweight", "core", "r", [],
    "Lie on your back, knees bent.|Curl your shoulders off the floor.|Lower slowly.",
    "Exhale as you curl up.");
  X("Sit-Up", "abs", "bodyweight", "core", "r", ["obliques"],
    "Lie on your back, knees bent, feet anchored.|Sit all the way up.|Lower slowly.",
    "Don't pull on your neck.");
  X("Bicycle Crunch", "obliques", "bodyweight", "core", "r", ["abs"],
    "Lie on your back, hands behind your head.|Bring one elbow toward the opposite knee as the other leg straightens.|Switch sides.",
    "Slow is better than fast.");
  X("Hanging Leg Raise", "abs", "pullupbar", "core", "r", ["forearms"],
    "Hang from a bar.|Raise your legs until they're level or higher.|Lower slowly.",
    "Curl your hips up at the top; don't swing.");
  X("Hanging Knee Raise", "abs", "pullupbar", "core", "r", ["forearms"],
    "Hang from a bar.|Bring your knees to your chest.|Lower slowly.",
    "An easier version of the leg raise.");
  X("Lying Leg Raise", "abs", "bodyweight", "core", "r", [],
    "Lie on your back, legs straight.|Lift your legs to vertical.|Lower slowly without touching the floor.",
    "Press your lower back into the floor.");
  X("Ab Wheel Rollout", "abs", "other", "core", "r", ["shoulders", "back"],
    "Kneel holding an ab wheel.|Roll it forward as far as you can control.|Pull back in.",
    "Keep your back from arching.");
  X("Cable Crunch", "abs", "cable", "core", "wr", [],
    "Kneel facing a high pulley holding a rope at your head.|Crunch down, bringing your elbows to your knees.|Return slowly.",
    "Your hips stay still; your spine curls.");
  X("Russian Twist", "obliques", "medball", "core", "r", ["abs"],
    "Sit leaning back with feet up.|Rotate side to side, touching the ball to the floor.|Each touch is one rep.",
    "Move your shoulders, not just your arms.");
  X("Mountain Climber", "abs", "bodyweight", "hiit", "t", ["shoulders", "cardio"],
    "Start in a high plank.|Drive one knee toward your chest, then switch quickly.|Keep going.",
    "Hips low and steady.");
  X("Dead Bug", "abs", "bodyweight", "core", "r", [],
    "Lie on your back, arms up, knees bent over your hips.|Lower one arm and the opposite leg toward the floor.|Return and switch.",
    "Your lower back never leaves the floor.");
  X("Bird Dog", "lowerback", "bodyweight", "core", "r", ["abs", "glutes"],
    "Start on hands and knees.|Reach one arm forward and the opposite leg back.|Return and switch.",
    "Imagine balancing a glass of water on your back.");
  X("Hollow Body Hold", "abs", "bodyweight", "core", "t", [],
    "Lie on your back with arms overhead.|Lift your shoulders and legs off the floor.|Hold.",
    "Bend your knees to make it easier.");
  X("V-Up", "abs", "bodyweight", "core", "r", [],
    "Lie flat, arms overhead.|Lift your arms and legs to meet in the middle.|Lower slowly.",
    "Keep your legs straight.");
  X("Pallof Press", "obliques", "cable", "core", "wr", ["abs"],
    "Stand side-on to a cable at chest height.|Press the handle straight out and hold.|Bring it back.",
    "Resist the pull — don't rotate.");
  X("Woodchopper", "obliques", "cable", "core", "wr", ["abs", "shoulders"],
    "Set a cable high and stand side-on.|Pull it diagonally down across your body.|Return slowly.",
    "Rotate from your torso and pivot your back foot.");
  X("Flutter Kicks", "abs", "bodyweight", "core", "t", [],
    "Lie on your back, legs straight and lifted.|Kick your legs up and down in small fast movements.|Keep going.",
    "Hands under your hips help your lower back.");
  X("Toe Touch", "abs", "bodyweight", "core", "r", [],
    "Lie on your back with legs straight up.|Reach your hands toward your toes.|Lower slowly.",
    "Lift your shoulder blades off the floor.");
  X("L-Sit", "abs", "bodyweight", "calisthenics", "t", ["triceps", "quads"],
    "Sit between parallel bars or on the floor with hands by your hips.|Press up and lift your legs straight out.|Hold.",
    "Tuck your knees at first.");
  X("Dragon Flag", "abs", "bench", "calisthenics", "r", ["lowerback"],
    "Lie on a bench holding it behind your head.|Lift your body until only your shoulders touch.|Lower your straight body slowly.",
    "Very advanced; build up with negatives.");

  // ---------------------------------------------------------------- Neck
  X("Neck Flexion", "neck", "other", "strength", "r", [],
    "Lie face up on a bench with your head off the end.|Lift your chin toward your chest.|Lower slowly.",
    "Light and slow — no weight to start.");
  X("Neck Extension", "neck", "other", "strength", "r", ["traps"],
    "Lie face down on a bench with your head off the end.|Lift your head back.|Lower slowly.",
    "Small, controlled movements.");

  // ---------------------------------------------------------------- Full body / Olympic
  X("Power Clean", "fullbody", "barbell", "olympic", "wr", ["traps", "glutes", "quads", "shoulders"],
    "Start like a deadlift.|Pull the bar past your knees and explode with your hips.|Shrug and pull yourself under the bar.|Catch it on your front shoulders in a quarter squat.",
    "Learn it with an empty bar or a coach.");
  X("Hang Clean", "fullbody", "barbell", "olympic", "wr", ["traps", "glutes", "quads"],
    "Hold the bar at mid-thigh.|Explode with your hips and shrug.|Catch the bar on your front shoulders.",
    "The bar stays close to your body.");
  X("Clean and Jerk", "fullbody", "barbell", "olympic", "wr", ["shoulders", "quads", "glutes"],
    "Clean the bar to your shoulders.|Dip and drive it overhead, splitting your feet.|Bring your feet together and stand.",
    "The jerk is a leg movement more than a press.");
  X("Snatch", "fullbody", "barbell", "olympic", "wr", ["shoulders", "traps", "quads", "glutes"],
    "Take a wide grip with the bar on the floor.|Pull and explode with your hips.|Pull under and catch the bar overhead in a squat.|Stand up.",
    "The most technical lift — practise with a PVC pipe.");
  X("Thruster", "fullbody", "barbell", "strength", "wr", ["quads", "shoulders", "glutes"],
    "Hold the bar on your front shoulders.|Squat down.|Drive up and press the bar overhead in one movement.",
    "Use the push from your legs to move the bar.");
  X("Dumbbell Snatch", "fullbody", "dumbbell", "olympic", "wr", ["shoulders", "glutes"],
    "Squat to hold a dumbbell between your feet.|Explode up and pull it overhead in one move.|Lower and repeat.",
    "Switch hands each set.");
  X("Turkish Get-Up", "fullbody", "kettlebell", "strength", "wr", ["shoulders", "abs", "glutes"],
    "Lie down holding a kettlebell straight up.|Roll to your elbow, then your hand.|Lift your hips, sweep your leg under and stand up.|Reverse to lie back down.",
    "Keep your eyes on the kettlebell.");
  X("Man Maker", "fullbody", "dumbbell", "hiit", "r", ["chest", "back", "shoulders", "quads"],
    "Start in a plank holding dumbbells.|Do a push-up, then row each side.|Jump your feet in, clean and press the dumbbells overhead.",
    "A full workout in one rep.");
  X("Sled Push", "fullbody", "other", "strength", "dt", ["quads", "glutes", "calves"],
    "Grip the sled handles with arms straight.|Lean in and drive with short, powerful steps.|Push for distance.",
    "Stay low.");
  X("Battle Ropes", "fullbody", "other", "hiit", "t", ["shoulders", "cardio"],
    "Hold a rope end in each hand, knees soft.|Make fast waves by moving your arms up and down.|Keep going for time.",
    "Stay in a half squat.");
  X("Tire Flip", "fullbody", "other", "strength", "r", ["glutes", "back", "quads"],
    "Squat and get your hands under the tire.|Drive it up with your legs and hips.|Push it over.",
    "Lift with your legs, not your back.");
  X("Wall Ball", "fullbody", "medball", "hiit", "r", ["quads", "shoulders"],
    "Hold a medicine ball at your chest facing a wall.|Squat down, then throw the ball up at a target.|Catch it and go straight into the next squat.",
    "Use your legs to throw.");
  X("Medicine Ball Slam", "fullbody", "medball", "hiit", "r", ["abs", "shoulders"],
    "Lift a slam ball overhead.|Slam it into the floor as hard as you can.|Pick it up and repeat.",
    "Use a ball made for slamming.");

  // ---------------------------------------------------------------- Plyometrics / HIIT
  X("Burpee", "fullbody", "bodyweight", "hiit", "r", ["chest", "quads", "cardio"],
    "Squat and put your hands on the floor.|Jump your feet back to a plank and do a push-up.|Jump your feet in and jump up.",
    "Find a pace you can keep.");
  X("Jumping Jacks", "cardio", "bodyweight", "hiit", "t", ["calves", "shoulders"],
    "Stand with feet together.|Jump your feet out and your arms overhead.|Jump back.",
    "A good warm-up.");
  X("High Knees", "cardio", "bodyweight", "hiit", "t", ["quads", "abs"],
    "Run on the spot.|Drive your knees up to hip height.|Keep going.",
    "Stay on the balls of your feet.");
  X("Box Jump", "quads", "box", "plyometrics", "r", ["glutes", "calves"],
    "Stand facing a sturdy box.|Swing your arms and jump onto it.|Land softly, stand, then step down.",
    "Step down — don't jump down.");
  X("Jump Squat", "quads", "bodyweight", "plyometrics", "r", ["glutes", "calves"],
    "Squat down.|Explode up into a jump.|Land softly and go into the next squat.",
    "Land quietly.");
  X("Broad Jump", "quads", "bodyweight", "plyometrics", "r", ["glutes", "hamstrings"],
    "Stand with feet hip-width.|Swing your arms and jump as far forward as you can.|Land softly.",
    "Reset between each jump.");
  X("Jumping Lunge", "quads", "bodyweight", "plyometrics", "r", ["glutes", "cardio"],
    "Start in a lunge.|Jump and switch legs in the air.|Land in a lunge on the other side.",
    "Keep your chest up.");
  X("Skater Jump", "glutes", "bodyweight", "plyometrics", "r", ["quads", "abductors"],
    "Jump sideways onto one leg.|Swing the other leg behind you.|Jump back to the other side.",
    "Stick each landing.");
  X("Tuck Jump", "quads", "bodyweight", "plyometrics", "r", ["abs", "calves"],
    "Jump straight up.|Pull your knees to your chest.|Land softly.",
    "Explosive and short.");
  X("Clap Push-Up", "chest", "bodyweight", "plyometrics", "r", ["triceps", "shoulders"],
    "Lower into a push-up.|Push up hard enough to leave the floor and clap.|Land softly.",
    "Start from your knees to learn it.");
  X("Bear Crawl", "fullbody", "bodyweight", "hiit", "dt", ["shoulders", "abs", "quads"],
    "Get on hands and feet, knees just off the floor.|Crawl forward moving opposite hand and foot.|Keep your back flat.",
    "Knees stay low.");
  X("Jump Rope", "cardio", "rope", "cardio", "t", ["calves", "shoulders"],
    "Hold the handles with the rope behind you.|Swing it over and hop as it passes under your feet.|Keep a steady rhythm.",
    "Small hops, wrists do the turning.");
  X("Double-Unders", "cardio", "rope", "hiit", "r", ["calves"],
    "Jump a bit higher than usual.|Spin the rope twice under your feet in one jump.|Keep going.",
    "Fast wrists, not big arms.");

  // ---------------------------------------------------------------- Cardio
  X("Running", "cardio", "bodyweight", "cardio", "dt", ["quads", "hamstrings", "calves"],
    "Warm up with a brisk walk.|Run at a pace you can talk at for easy runs.|Cool down with a walk.",
    "Most runs should feel easy.");
  X("Treadmill Run", "cardio", "cardio", "cardio", "dt", ["quads", "calves"],
    "Start at a walk.|Raise the speed to your running pace.|Set a 1% incline to match outdoor running.",
    "Don't hold the handrails.");
  X("Incline Walk", "cardio", "cardio", "cardio", "dt", ["glutes", "calves"],
    "Set the treadmill to a steep incline.|Walk at a brisk pace without holding on.|Keep going.",
    "Easy on the joints, big calorie burn.");
  X("Walking", "cardio", "bodyweight", "cardio", "dt", ["calves"],
    "Walk at a brisk pace.|Swing your arms naturally.|Keep going.",
    "The most underrated exercise there is.");
  X("Hiking", "cardio", "bodyweight", "cardio", "dt", ["quads", "glutes", "calves"],
    "Pick a trail.|Walk at a steady pace, shorter steps uphill.|Bring water.",
    "Log the distance and time.");
  X("Cycling", "cardio", "other", "cardio", "dt", ["quads", "calves"],
    "Set the saddle so your knee is slightly bent at the bottom.|Ride at a steady cadence.|Keep going.",
    "Aim for 80–90 pedal turns a minute.");
  X("Stationary Bike", "cardio", "cardio", "cardio", "dt", ["quads"],
    "Set the seat to hip height.|Pedal at a steady effort.|Keep going.",
    "Great for low-impact intervals.");
  X("Spin Class", "cardio", "cardio", "hiit", "t", ["quads", "glutes"],
    "Set up your bike.|Follow the instructor's intervals.|Cool down at the end.",
    "Log the length of the class.");
  X("Rowing Machine", "cardio", "cardio", "cardio", "dt", ["back", "quads", "biceps"],
    "Strap in and grip the handle.|Push with your legs, then lean back and pull the handle to your ribs.|Reverse: arms, body, then legs.",
    "60% legs, 20% core, 20% arms.");
  X("Elliptical", "cardio", "cardio", "cardio", "dt", ["quads", "glutes"],
    "Step on and grip the handles.|Push and pull in a smooth stride.|Keep going.",
    "Low impact.");
  X("Stair Climber", "cardio", "cardio", "cardio", "t", ["glutes", "quads", "calves"],
    "Step on and choose a speed.|Climb at a steady pace without leaning on the rails.|Keep going.",
    "Stand tall.");
  X("Swimming", "cardio", "other", "cardio", "dt", ["back", "shoulders", "fullbody"],
    "Warm up with easy lengths.|Swim at a steady pace.|Cool down with easy lengths.",
    "Log distance in metres or yards.");
  X("Assault Bike", "cardio", "cardio", "hiit", "t", ["quads", "shoulders"],
    "Sit and grip the handles.|Push and pull with arms and legs together.|Go hard for intervals.",
    "Brutal for sprints.");
  X("Ski Erg", "cardio", "cardio", "cardio", "dt", ["back", "triceps", "abs"],
    "Stand and grip the handles overhead.|Pull down with your arms while hinging at the hips.|Return tall.",
    "Hinge, don't squat.");
  X("Sprints", "cardio", "bodyweight", "hiit", "dt", ["hamstrings", "glutes", "quads"],
    "Warm up well.|Run as fast as you can for a short distance.|Walk back to recover and repeat.",
    "Full rest between sprints.");
  X("Dancing", "cardio", "bodyweight", "cardio", "t", ["calves", "fullbody"],
    "Put on some music.|Move.|Keep going.",
    "It all counts.");
  X("Boxing", "cardio", "other", "hiit", "t", ["shoulders", "abs"],
    "Get in your stance with hands up.|Throw punches in combinations.|Move your feet.",
    "Rotate from your hips.");
  X("Shadow Boxing", "cardio", "bodyweight", "hiit", "t", ["shoulders"],
    "Stand in your boxing stance.|Throw punches at the air with good form.|Move constantly.",
    "Do 3-minute rounds.");

  // ---------------------------------------------------------------- Stretching
  X("Hamstring Stretch", "hamstrings", "mat", "stretching", "t", [],
    "Sit with one leg straight, the other foot against your thigh.|Reach toward your toes with a flat back.|Hold, then switch.",
    "Breathe out and relax into it.");
  X("Quad Stretch", "quads", "bodyweight", "stretching", "t", [],
    "Stand and pull one heel toward your glutes.|Keep your knees together.|Hold, then switch.",
    "Hold something for balance.");
  X("Calf Stretch", "calves", "bodyweight", "stretching", "t", [],
    "Put your hands on a wall with one foot back.|Press the back heel down with your leg straight.|Hold, then switch.",
    "Bend the back knee to stretch the lower calf.");
  X("Hip Flexor Stretch", "abductors", "mat", "stretching", "t", ["quads"],
    "Kneel on one knee with the other foot in front.|Push your hips forward.|Hold, then switch.",
    "Squeeze the glute of the back leg.");
  X("Pigeon Stretch", "glutes", "mat", "stretching", "t", ["abductors"],
    "From a plank, bring one knee forward behind your wrist.|Stretch your back leg out.|Lower your hips and hold.",
    "Use a cushion under your hip if you need one.");
  X("Butterfly Stretch", "adductors", "mat", "stretching", "t", [],
    "Sit with the soles of your feet together.|Let your knees drop toward the floor.|Hold.",
    "Gently press with your elbows.");
  X("Chest Doorway Stretch", "chest", "bodyweight", "stretching", "t", ["shoulders"],
    "Put your forearms on a doorframe.|Step through until you feel a stretch.|Hold.",
    "Great after a day at a desk.");
  X("Cross-Body Shoulder Stretch", "shoulders", "bodyweight", "stretching", "t", [],
    "Bring one arm across your chest.|Pull it in with the other arm.|Hold, then switch.",
    "Keep your shoulder down.");
  X("Triceps Stretch", "triceps", "bodyweight", "stretching", "t", ["shoulders"],
    "Reach one hand behind your head.|Press the elbow down with the other hand.|Hold, then switch.",
    "Stand tall.");
  X("Lat Stretch", "back", "bodyweight", "stretching", "t", [],
    "Hold a post or doorframe with one hand.|Lean your hips away.|Hold, then switch.",
    "Feel the stretch down your side.");
  X("Neck Stretch", "neck", "bodyweight", "stretching", "t", ["traps"],
    "Tilt your ear toward your shoulder.|Rest your hand on your head lightly.|Hold, then switch.",
    "Gentle — never pull hard.");
  X("Wrist Stretch", "forearms", "bodyweight", "stretching", "t", [],
    "Hold one arm out, palm up.|Gently pull your fingers back.|Hold, then flip and switch.",
    "Good for typists.");
  X("Standing Side Stretch", "obliques", "bodyweight", "stretching", "t", ["back"],
    "Stand tall and reach one arm overhead.|Lean to the opposite side.|Hold, then switch.",
    "Don't lean forward.");
  X("Figure-Four Stretch", "glutes", "mat", "stretching", "t", [],
    "Lie on your back and cross one ankle over the other knee.|Pull the bottom leg toward you.|Hold, then switch.",
    "Easier than pigeon.");
  X("Knee-to-Chest Stretch", "lowerback", "mat", "stretching", "t", ["glutes"],
    "Lie on your back.|Hug both knees into your chest.|Hold and breathe.",
    "Rock gently side to side.");

  // ---------------------------------------------------------------- Yoga
  X("Sun Salutation", "fullbody", "mat", "yoga", "r", ["hamstrings", "shoulders"],
    "Reach up, fold forward, step back to plank.|Lower, then lift into cobra or upward dog.|Push back to downward dog and step forward.|Rise up.",
    "Move with your breath.");
  X("Downward Dog", "hamstrings", "mat", "yoga", "t", ["calves", "shoulders"],
    "From hands and knees, lift your hips up and back.|Press your heels toward the floor.|Hold.",
    "Bend your knees to keep a long back.");
  X("Child's Pose", "lowerback", "mat", "yoga", "t", ["back"],
    "Kneel and sit back on your heels.|Reach your arms forward and rest your forehead down.|Breathe.",
    "A resting pose — use it any time.");
  X("Cobra Pose", "lowerback", "mat", "yoga", "t", ["abs"],
    "Lie face down with hands under your shoulders.|Press up and lift your chest.|Keep your hips down and hold.",
    "Shoulders down, away from your ears.");
  X("Cat-Cow", "lowerback", "mat", "yoga", "r", ["abs"],
    "Start on hands and knees.|Arch your back and look up (cow).|Round your back and tuck your chin (cat).",
    "Move slowly with your breath.");
  X("Warrior II", "quads", "mat", "yoga", "t", ["glutes", "shoulders"],
    "Step wide, front foot forward, back foot sideways.|Bend your front knee over your ankle.|Reach your arms out and hold.",
    "Look over your front hand.");
  X("Tree Pose", "calves", "mat", "yoga", "t", ["abs", "abductors"],
    "Stand on one leg.|Place the other foot on your calf or thigh (not the knee).|Hands at your chest and hold.",
    "Fix your eyes on one spot.");
  X("Chair Pose", "quads", "mat", "yoga", "t", ["glutes", "shoulders"],
    "Stand with feet together.|Sit back as if into a chair.|Raise your arms and hold.",
    "Weight in your heels.");
  X("Bridge Pose", "glutes", "mat", "yoga", "t", ["hamstrings", "lowerback"],
    "Lie on your back with knees bent.|Lift your hips and lace your hands under you.|Hold.",
    "Keep your knees hip-width.");
  X("Boat Pose", "abs", "mat", "yoga", "t", [],
    "Sit and lean back with your legs lifted.|Reach your arms forward.|Hold.",
    "Bend your knees if your back rounds.");
  X("Seated Forward Fold", "hamstrings", "mat", "yoga", "t", ["lowerback"],
    "Sit with your legs straight.|Hinge forward from your hips.|Hold.",
    "Lead with your chest.");
  X("Corpse Pose", "fullbody", "mat", "yoga", "t", [],
    "Lie on your back, arms by your sides.|Close your eyes and relax every muscle.|Breathe slowly.",
    "The end of every yoga session.");

  // ---------------------------------------------------------------- Mobility
  X("Foam Roll Quads", "quads", "foamroller", "mobility", "t", [],
    "Lie face down with the roller under your thighs.|Roll slowly from hips to knees.|Pause on tight spots.",
    "Breathe and go slow.");
  X("Foam Roll Upper Back", "back", "foamroller", "mobility", "t", ["traps"],
    "Lie with the roller under your upper back.|Lift your hips and roll slowly.|Hug your chest.",
    "Stay off your lower back.");
  X("Foam Roll IT Band", "abductors", "foamroller", "mobility", "t", ["quads"],
    "Lie on your side with the roller under your outer thigh.|Roll from hip to knee.|Use your top leg to take some weight.",
    "It can be intense — go easy.");
  X("World's Greatest Stretch", "fullbody", "bodyweight", "mobility", "r", ["abductors", "hamstrings", "back"],
    "Step into a deep lunge.|Put the same-side hand down inside your foot.|Rotate and reach the other arm to the sky.|Switch sides.",
    "A complete warm-up in one move.");
  X("Hip Circles", "abductors", "bodyweight", "mobility", "r", ["glutes"],
    "Stand on one leg holding something.|Draw big circles with your other knee.|Switch direction and leg.",
    "Big, slow circles.");
  X("Arm Circles", "shoulders", "bodyweight", "mobility", "r", [],
    "Stretch your arms out to the sides.|Make small circles, growing bigger.|Switch direction.",
    "A quick shoulder warm-up.");
  X("Thoracic Rotation", "back", "mat", "mobility", "r", ["obliques"],
    "Lie on your side with knees bent.|Open your top arm across to the other side.|Follow your hand with your eyes.",
    "Keep your knees together.");
  X("Leg Swings", "hamstrings", "bodyweight", "mobility", "r", ["abductors"],
    "Hold a wall and swing one leg forward and back.|Then side to side.|Switch legs.",
    "Loosen up before running.");
  X("Deep Squat Hold", "glutes", "bodyweight", "mobility", "t", ["adductors", "calves"],
    "Squat as low as you can with heels down.|Push your knees out with your elbows.|Hold.",
    "Hold onto something to start.");
  X("Ankle Mobility Drill", "calves", "bodyweight", "mobility", "r", [],
    "Kneel facing a wall with one foot forward.|Push your knee toward the wall, heel down.|Return and repeat.",
    "Helps squats feel better.");

  // Exercises with a demo: two photos, start and end of the movement, in
  // demos/<id>/0.jpg and 1.jpg, shown one after the other as a loop. From
  // Free Exercise DB (github.com/yuhonas/free-exercise-db), public domain
  // (Unlicense). An exercise not listed here has no demo.
  const DEMOS = new Set([
    "ab-wheel-rollout", "arm-circles", "arnold-press", "assisted-pull-up", "back-extension", "back-squat",
    "band-pull-apart", "banded-lateral-walk", "barbell-bench-press", "barbell-curl", "barbell-row",
    "barbell-shrug", "battle-ropes", "bench-dip", "bicycle-crunch", "bodyweight-squat", "box-jump",
    "box-squat", "broad-jump", "bulgarian-split-squat", "cable-crossover", "cable-crunch", "cable-curl",
    "cable-kickback", "cable-lateral-raise", "cable-overhead-extension", "calf-stretch", "cat-cow",
    "chest-dip", "chest-doorway-stretch", "chest-supported-row", "child-s-pose", "chin-up", "clap-push-up",
    "clean-and-jerk", "close-grip-bench-press", "close-grip-lat-pulldown", "concentration-curl",
    "cross-body-shoulder-stretch", "crunch", "cycling", "dead-bug", "deadlift", "decline-barbell-bench-press",
    "decline-push-up", "diamond-push-up", "double-unders", "dumbbell-bench-press", "dumbbell-curl",
    "dumbbell-fly", "dumbbell-romanian-deadlift", "dumbbell-row", "dumbbell-shrug", "dumbbell-snatch",
    "elliptical", "ez-bar-curl", "face-pull", "farmer-s-carry", "figure-four-stretch", "flutter-kicks",
    "foam-roll-it-band", "foam-roll-quads", "foam-roll-upper-back", "front-raise", "front-squat",
    "glute-bridge", "glute-ham-raise", "goblet-squat", "good-morning", "hack-squat", "hammer-curl",
    "hamstring-stretch", "handstand-push-up", "hang-clean", "hanging-knee-raise", "hanging-leg-raise",
    "hiking", "hip-abduction-machine", "hip-adduction-machine", "hip-flexor-stretch", "hip-thrust",
    "incline-barbell-bench-press", "incline-dumbbell-curl", "incline-dumbbell-fly", "incline-dumbbell-press",
    "incline-push-up", "incline-walk", "inverted-row", "jump-rope", "jump-squat", "jumping-lunge",
    "kettlebell-swing", "knee-to-chest-stretch", "lat-pulldown", "lat-stretch", "lateral-raise",
    "leg-extension", "leg-press", "low-to-high-cable-fly", "lying-leg-curl", "lying-leg-raise",
    "machine-chest-press", "machine-row", "machine-shoulder-press", "medicine-ball-slam", "mountain-climber",
    "neck-extension", "neck-flexion", "neck-stretch", "neutral-grip-pull-up", "nordic-curl", "overhead-press",
    "overhead-triceps-extension", "pallof-press", "pec-deck", "pendlay-row", "pistol-squat", "plank",
    "plate-pinch", "power-clean", "preacher-curl", "pull-up", "push-press", "push-up", "quad-stretch",
    "rack-pull", "rear-delt-fly", "reverse-curl", "reverse-lunge", "reverse-pec-deck", "reverse-wrist-curl",
    "romanian-deadlift", "rope-pushdown", "rowing-machine", "russian-twist", "seated-cable-row",
    "seated-calf-raise", "seated-dumbbell-press", "seated-leg-curl", "side-plank", "single-leg-glute-bridge",
    "single-leg-romanian-deadlift", "sissy-squat", "sit-up", "skater-jump", "skull-crusher", "sled-push",
    "smith-machine-squat", "snatch", "spider-curl", "spin-class", "sprints", "stair-climber",
    "standing-calf-raise", "standing-side-stretch", "stationary-bike", "step-up", "stiff-leg-deadlift",
    "straight-arm-pulldown", "sumo-deadlift", "superman", "svend-press", "t-bar-row", "thruster", "tire-flip",
    "toe-touch", "trap-bar-deadlift", "treadmill-run", "triceps-dip", "triceps-kickback", "triceps-pushdown",
    "triceps-stretch", "trx-row", "tuck-jump", "turkish-get-up", "upright-row", "v-up", "walking-lunge",
    "wide-push-up", "woodchopper", "world-s-greatest-stretch", "wrist-curl",
  ]);
  // Exercises with no photo get a drawing instead: a figure in the start and
  // end position, drawn for KPR Fitness by tools/draw-demos (same files,
  // demos/<id>/0.jpg and 1.jpg). Together every exercise has a demo.
  const DRAWN = new Set([
    "burpee", "jumping-jacks", "high-knees", "running", "walking", "assault-bike", "bird-dog",
    "hollow-body-hold", "pigeon-stretch", "wrist-stretch", "sun-salutation", "downward-dog", "cobra-pose",
    "warrior-ii", "tree-pose", "corpse-pose", "thoracic-rotation", "deep-squat-hold", "pike-push-up",
    "landmine-press", "dead-hang", "lateral-lunge", "wall-sit", "clamshell", "single-leg-calf-raise",
    "tibialis-raise", "l-sit", "dragon-flag", "man-maker", "wall-ball", "bear-crawl", "swimming", "ski-erg",
    "dancing", "boxing", "shadow-boxing", "butterfly-stretch", "chair-pose", "bridge-pose", "boat-pose",
    "seated-forward-fold", "hip-circles", "leg-swings", "ankle-mobility-drill",
  ]);
  DRAWN.forEach((id) => DEMOS.add(id));
  LIST.forEach((e) => { e.demo = DEMOS.has(e.id); e.drawn = DRAWN.has(e.id); });

  const BY_ID = new Map(LIST.map((e) => [e.id, e]));

  // Routines everyone gets to start from. Exercises are by id; sets are
  // what the routine suggests (reps or seconds).
  const R = (id, name, about, level, items) => ({ id, name, about, level, builtin: true, items: items.map(([ex, sets, reps, rest]) => ({ ex, sets, reps, rest: rest == null ? 90 : rest })) });
  const ROUTINES = [
    R("starter-full-body", "Full body — beginner", "Three times a week. Every main muscle, simple moves.", "Beginner", [
      ["goblet-squat", 3, 10], ["push-up", 3, 8], ["dumbbell-row", 3, 10], ["glute-bridge", 3, 12], ["seated-dumbbell-press", 2, 10], ["plank", 3, 30, 60]]),
    R("strength-5x5-a", "5×5 strength — day A", "Alternate with day B, three days a week. Add weight every session.", "Intermediate", [
      ["back-squat", 5, 5, 180], ["barbell-bench-press", 5, 5, 180], ["barbell-row", 5, 5, 180]]),
    R("strength-5x5-b", "5×5 strength — day B", "Alternate with day A.", "Intermediate", [
      ["back-squat", 5, 5, 180], ["overhead-press", 5, 5, 180], ["deadlift", 1, 5, 180]]),
    R("ppl-push", "Push — chest, shoulders, triceps", "Part of push / pull / legs.", "Intermediate", [
      ["barbell-bench-press", 4, 8, 150], ["incline-dumbbell-press", 3, 10], ["seated-dumbbell-press", 3, 10], ["lateral-raise", 3, 15, 60], ["rope-pushdown", 3, 12, 60], ["overhead-triceps-extension", 3, 12, 60]]),
    R("ppl-pull", "Pull — back, biceps", "Part of push / pull / legs.", "Intermediate", [
      ["deadlift", 3, 5, 180], ["pull-up", 3, 8, 120], ["barbell-row", 3, 10], ["face-pull", 3, 15, 60], ["barbell-curl", 3, 10, 60], ["hammer-curl", 3, 12, 60]]),
    R("ppl-legs", "Legs — quads, hamstrings, glutes", "Part of push / pull / legs.", "Intermediate", [
      ["back-squat", 4, 6, 180], ["romanian-deadlift", 3, 10, 120], ["leg-press", 3, 12], ["lying-leg-curl", 3, 12, 60], ["standing-calf-raise", 4, 15, 60], ["hanging-leg-raise", 3, 12, 60]]),
    R("upper-body", "Upper body", "Pair with Lower body for a 4-day split.", "Intermediate", [
      ["barbell-bench-press", 4, 6, 150], ["barbell-row", 4, 8, 120], ["overhead-press", 3, 8, 120], ["lat-pulldown", 3, 10], ["dumbbell-curl", 3, 12, 60], ["triceps-pushdown", 3, 12, 60]]),
    R("lower-body", "Lower body", "Pair with Upper body for a 4-day split.", "Intermediate", [
      ["back-squat", 4, 6, 180], ["romanian-deadlift", 3, 8, 120], ["bulgarian-split-squat", 3, 10], ["leg-extension", 3, 12, 60], ["seated-calf-raise", 4, 15, 60], ["plank", 3, 45, 60]]),
    R("home-no-equipment", "Home — no equipment", "Anywhere, nothing needed. Do it as a circuit.", "Beginner", [
      ["bodyweight-squat", 3, 20, 45], ["push-up", 3, 12, 45], ["reverse-lunge", 3, 12, 45], ["superman", 3, 12, 45], ["glute-bridge", 3, 15, 45], ["mountain-climber", 3, 30, 45], ["plank", 3, 40, 45]]),
    R("hiit-20", "HIIT — 20 minutes", "40 seconds on, 20 off, four rounds. Rep targets are what fits in 40 seconds.", "All levels", [
      ["burpee", 4, 10, 20], ["jump-squat", 4, 15, 20], ["mountain-climber", 4, 40, 20], ["high-knees", 4, 40, 20], ["jumping-lunge", 4, 12, 20]]),
    R("core-10", "Core — 10 minutes", "A quick core finisher.", "All levels", [
      ["dead-bug", 2, 12, 30], ["plank", 2, 45, 30], ["side-plank", 2, 30, 30], ["bicycle-crunch", 2, 20, 30], ["hollow-body-hold", 2, 30, 30]]),
    R("mobility-15", "Mobility — 15 minutes", "Loosen up on rest days or before training.", "All levels", [
      ["cat-cow", 1, 10, 0], ["world-s-greatest-stretch", 1, 8, 0], ["thoracic-rotation", 1, 10, 0], ["hip-flexor-stretch", 2, 30, 0], ["pigeon-stretch", 2, 45, 0], ["deep-squat-hold", 1, 60, 0], ["child-s-pose", 1, 60, 0]]),
    R("run-easy", "Easy run", "Conversation pace. Warm up and cool down with a walk.", "All levels", [
      ["walking", 1, 0, 0], ["running", 1, 0, 0], ["calf-stretch", 2, 30, 0], ["hamstring-stretch", 2, 30, 0]]),

    // ---- Programs added for the goals below ----
    R("fat-loss-circuit-a", "Fat loss — circuit A", "Full body, short rests, keeps your heart rate up. Go round as a circuit.", "All levels", [
      ["goblet-squat", 3, 12, 45], ["push-up", 3, 10, 45], ["dumbbell-row", 3, 12, 45], ["reverse-lunge", 3, 10, 45], ["kettlebell-swing", 3, 15, 45], ["mountain-climber", 3, 30, 45], ["plank", 3, 40, 45]]),
    R("fat-loss-circuit-b", "Fat loss — circuit B", "The other half of the circuits. Alternate A and B.", "All levels", [
      ["dumbbell-romanian-deadlift", 3, 12, 45], ["seated-dumbbell-press", 3, 10, 45], ["lat-pulldown", 3, 12, 45], ["step-up", 3, 10, 45], ["burpee", 3, 10, 45], ["bicycle-crunch", 3, 20, 45], ["jump-rope", 3, 60, 45]]),
    R("fat-loss-intervals", "Cardio intervals — 20 minutes", "Short hard efforts with easy recovery. Warm up first.", "Intermediate", [
      ["jumping-jacks", 1, 120, 0], ["assault-bike", 8, 20, 60], ["high-knees", 4, 30, 30], ["mountain-climber", 4, 30, 30]]),
    R("fat-loss-steady", "Steady cardio — 30 to 45 minutes", "Easy pace you could chat at. Pick one machine and log distance and time.", "All levels", [
      ["incline-walk", 1, 0, 0], ["calf-stretch", 2, 30, 0], ["hip-flexor-stretch", 2, 30, 0]]),
    R("abs-strength", "Six-pack — weighted abs", "Abs are a muscle: load them and they grow. Add weight when reps get easy.", "Intermediate", [
      ["cable-crunch", 3, 12, 60], ["hanging-leg-raise", 3, 10, 60], ["ab-wheel-rollout", 3, 8, 60], ["pallof-press", 3, 12, 45], ["side-plank", 3, 30, 30]]),
    R("abs-bodyweight", "Six-pack — no-equipment abs", "Upper abs, lower abs and obliques with nothing but a mat.", "All levels", [
      ["crunch", 3, 20, 30], ["lying-leg-raise", 3, 15, 30], ["bicycle-crunch", 3, 20, 30], ["v-up", 3, 12, 30], ["russian-twist", 3, 20, 30], ["hollow-body-hold", 3, 30, 30], ["plank", 2, 60, 30]]),
    R("arms-day", "Arms — biceps and triceps", "An extra arm day on top of a split.", "Intermediate", [
      ["barbell-curl", 3, 10, 60], ["close-grip-bench-press", 3, 8, 90], ["hammer-curl", 3, 12, 60], ["skull-crusher", 3, 10, 60], ["incline-dumbbell-curl", 3, 12, 60], ["rope-pushdown", 3, 15, 45]]),
    R("maintain-full-body-a", "Stay fit — full body A", "The big lifts, moderate weight. Leave a rep or two in the tank.", "All levels", [
      ["back-squat", 3, 8, 120], ["barbell-bench-press", 3, 8, 120], ["barbell-row", 3, 8, 90], ["plank", 3, 45, 60]]),
    R("maintain-full-body-b", "Stay fit — full body B", "Alternate with A.", "All levels", [
      ["romanian-deadlift", 3, 8, 120], ["overhead-press", 3, 8, 90], ["pull-up", 3, 6, 90], ["walking-lunge", 2, 12, 60], ["side-plank", 2, 30, 30]]),
    R("tone-full-body", "Tone up — full body", "Moderate weights, higher reps, short rests.", "Beginner", [
      ["goblet-squat", 3, 15, 60], ["push-up", 3, 12, 60], ["dumbbell-row", 3, 15, 60], ["glute-bridge", 3, 15, 45], ["lateral-raise", 3, 15, 45], ["triceps-kickback", 3, 15, 45], ["dead-bug", 3, 12, 30]]),
    R("tone-lower", "Tone up — legs and glutes", "Shapes the legs and glutes.", "Beginner", [
      ["bulgarian-split-squat", 3, 12, 60], ["hip-thrust", 3, 12, 60], ["dumbbell-romanian-deadlift", 3, 12, 60], ["banded-lateral-walk", 3, 20, 30], ["standing-calf-raise", 3, 15, 45]]),
    R("starter-full-body-b", "Full body — beginner B", "Alternate with Full body — beginner. Machines make it easy to learn.", "Beginner", [
      ["leg-press", 3, 10, 90], ["incline-push-up", 3, 10, 60], ["lat-pulldown", 3, 10, 90], ["dumbbell-romanian-deadlift", 3, 10, 90], ["bird-dog", 2, 10, 45], ["side-plank", 2, 20, 45]]),
    R("walk-brisk", "Brisk walk", "30 minutes at a pace where talking takes a little effort.", "Beginner", [
      ["walking", 1, 0, 0], ["calf-stretch", 2, 30, 0], ["hamstring-stretch", 2, 30, 0]]),
    R("home-dumbbells", "Home — a pair of dumbbells", "Everything a full gym session does, with two dumbbells.", "All levels", [
      ["goblet-squat", 3, 12, 60], ["dumbbell-row", 3, 12, 60], ["seated-dumbbell-press", 3, 10, 60], ["dumbbell-romanian-deadlift", 3, 12, 60], ["reverse-lunge", 3, 10, 60], ["dumbbell-curl", 2, 12, 45], ["plank", 3, 40, 45]]),
    R("run-intervals", "Run intervals", "Warm up with a walk, then repeat: fast for 1 minute, walk 90 seconds.", "Intermediate", [
      ["walking", 1, 0, 0], ["sprints", 6, 0, 90], ["walking", 1, 0, 0]]),
    R("stamina-circuit", "Stamina circuit", "Five moves, four rounds, little rest. Builds the engine.", "Intermediate", [
      ["jump-rope", 4, 60, 30], ["burpee", 4, 10, 30], ["jump-squat", 4, 15, 30], ["mountain-climber", 4, 30, 30], ["battle-ropes", 4, 30, 60]]),
    R("yoga-flow-20", "Yoga flow — 20 minutes", "Slow and steady. Breathe through each hold.", "All levels", [
      ["sun-salutation", 1, 5, 0], ["downward-dog", 2, 45, 0], ["warrior-ii", 2, 45, 0], ["tree-pose", 2, 30, 0], ["pigeon-stretch", 2, 45, 0], ["cobra-pose", 2, 30, 0], ["child-s-pose", 1, 60, 0], ["corpse-pose", 1, 120, 0]]),
    R("desk-relief", "Desk relief — 10 minutes", "For stiff necks, backs and hips after a day of sitting.", "All levels", [
      ["neck-stretch", 2, 30, 0], ["chest-doorway-stretch", 2, 30, 0], ["cat-cow", 1, 10, 0], ["thoracic-rotation", 1, 10, 0], ["hip-flexor-stretch", 2, 30, 0], ["wrist-stretch", 2, 30, 0]]),
    R("glute-builder", "Glute builder", "Heavy hip thrusts first, then single-leg and isolation work.", "Intermediate", [
      ["hip-thrust", 4, 10, 90], ["bulgarian-split-squat", 3, 10, 90], ["romanian-deadlift", 3, 10, 90], ["cable-kickback", 3, 15, 45], ["hip-abduction-machine", 3, 15, 45]]),
  ];

  // Programs grouped by what people want. Each goal lists its routines (ids
  // above, in the order to do them) and a suggested week. Honest about what
  // training can and can't do (no spot fat loss).
  const GOALS = [
    { id: "lose-fat", icon: "🔥", name: "Lose fat", tagline: "Including belly fat",
      about: "You can't burn fat from one spot: crunches alone won't shrink the belly. What works is losing fat all over, and the belly goes with it. Combine strength circuits (keep your muscle), cardio, a small calorie deficit and more daily steps.",
      week: "4 days: circuit A, cardio intervals, circuit B, steady cardio. Walk 8,000+ steps every day.",
      tips: ["Aim to lose about 0.5–1% of your body weight a week; faster usually comes back.", "Eat plenty of protein and vegetables; they keep you full.", "Weigh yourself in the Body tab once a week, same time of day, and watch the trend, not single days.", "Sleep 7–9 hours: short sleep makes you hungrier."],
      routines: ["fat-loss-circuit-a", "fat-loss-intervals", "fat-loss-circuit-b", "fat-loss-steady", "hiit-20"] },
    { id: "six-pack", icon: "🎯", name: "Get a six-pack", tagline: "Visible, strong abs",
      about: "Everyone has a six-pack; it shows when body fat is low enough (roughly under 12–15% for men and 18–22% for women). So it takes two things: training the abs so they grow, and losing the fat that covers them.",
      week: "Abs 3 days a week (weighted and no-equipment, alternating) after your main workout, plus 2–3 cardio sessions.",
      tips: ["Treat abs like any muscle: add reps or weight over time.", "Breathe out and squeeze at the top of every rep; slow beats fast.", "The fat-loss tips apply here too: the diet does most of the showing."],
      routines: ["abs-strength", "abs-bodyweight", "core-10", "fat-loss-intervals"] },
    { id: "build-muscle", icon: "💪", name: "Build muscle", tagline: "Bigger and fuller",
      about: "Muscle grows when you train each muscle about twice a week, hard (within 1–3 reps of failure), and keep adding weight or reps. Push / pull / legs or upper / lower both work well.",
      week: "Push, pull, legs, rest, push, pull, legs, rest — or upper, lower, rest, upper, lower, rest, rest. Add the arm day if you like.",
      tips: ["Use the Previous column: beat last time by one rep or a little weight.", "Eat a little more than you burn, with about 1.6–2.2 g of protein per kg of body weight.", "8–12 reps for most moves, 5–8 for the big ones."],
      routines: ["ppl-push", "ppl-pull", "ppl-legs", "upper-body", "lower-body", "arms-day"] },
    { id: "get-stronger", icon: "🏋️", name: "Get stronger", tagline: "Lift heavier",
      about: "Strength comes from heavy, low-rep sets on a few big lifts, adding a little weight every session for as long as you can.",
      week: "3 days a week, alternating day A and day B (Monday, Wednesday, Friday).",
      tips: ["Add 2.5 kg (5 lb) to each lift every session while you can.", "Rest 3 minutes between heavy sets.", "Film a set now and then to check your form."],
      routines: ["strength-5x5-a", "strength-5x5-b"] },
    { id: "maintain", icon: "⚖️", name: "Stay fit", tagline: "Maintain what you have",
      about: "Keeping fitness takes much less than building it: two or three sessions a week of strength, a little cardio and some mobility keep you where you are.",
      week: "Full body A, an easy run or walk, full body B. Mobility whenever you're stiff.",
      tips: ["Consistency beats intensity: two workouts every week for a year beats a hard month.", "Keep the weights the same as long as the reps stay the same."],
      routines: ["maintain-full-body-a", "maintain-full-body-b", "run-easy", "mobility-15"] },
    { id: "tone-up", icon: "✨", name: "Tone up", tagline: "Leaner, more defined",
      about: "\"Toned\" means some more muscle and a little less fat. Moderate weights for higher reps, plus some cardio, gets you there.",
      week: "3–4 days: full body, legs and glutes, HIIT, full body.",
      tips: ["Light weights are fine only if the last reps feel hard.", "Pair it with the fat-loss tips if you also want to lose fat."],
      routines: ["tone-full-body", "tone-lower", "hiit-20"] },
    { id: "beginner", icon: "🌱", name: "Just starting", tagline: "New to working out",
      about: "Start with simple moves, light weights and good form. Two or three short sessions a week build the habit and the base for everything else.",
      week: "3 days a week, alternating beginner A and B. Walk on two other days.",
      tips: ["The first two weeks, stop every set with a few reps to spare.", "Being sore after the first sessions is normal; it fades.", "Open any exercise to see how to do it and watch its demo."],
      routines: ["starter-full-body", "starter-full-body-b", "walk-brisk"] },
    { id: "home", icon: "🏠", name: "Train at home", tagline: "Little or no equipment",
      about: "Bodyweight and a pair of dumbbells can do almost everything a gym does. Make it harder with slower reps, more reps or less rest.",
      week: "3–4 days: alternate no-equipment and dumbbells. Add core or HIIT on a spare day.",
      tips: ["Clear a mat-sized space and keep the dumbbells in sight: it makes starting easier."],
      routines: ["home-no-equipment", "home-dumbbells", "core-10", "hiit-20"] },
    { id: "stamina", icon: "🏃", name: "Build stamina", tagline: "Cardio and endurance",
      about: "Most of your cardio should be easy, with one or two harder sessions a week. That's how runners, cyclists and rowers build an engine without burning out.",
      week: "Easy run, intervals, easy run, stamina circuit. Make one easy session a little longer each week.",
      tips: ["Easy means you can hold a conversation.", "Add no more than about 10% to your weekly distance at a time."],
      routines: ["run-easy", "run-intervals", "stamina-circuit", "fat-loss-steady"] },
    { id: "flexibility", icon: "🧘", name: "Flexibility & mobility", tagline: "Move better, feel looser",
      about: "Short, regular sessions beat one long one. Stretch when you're warm and hold each stretch without bouncing.",
      week: "10–20 minutes on most days. Desk relief on work days.",
      tips: ["Never stretch into pain: mild tension is enough.", "Hold stretches 30–60 seconds and breathe slowly."],
      routines: ["mobility-15", "yoga-flow-20", "desk-relief"] },
    { id: "glutes-legs", icon: "🍑", name: "Glutes & legs", tagline: "Stronger, shapelier lower body",
      about: "Glutes grow with heavy hip thrusts and hinges, single-leg work and a bit of isolation, trained twice a week.",
      week: "Glute builder and lower body, 2–3 days apart, plus an upper-body day if you like.",
      tips: ["Pause and squeeze for a second at the top of every hip thrust.", "Push the floor away through your heels on squats and lunges."],
      routines: ["glute-builder", "lower-body", "tone-lower"] },
  ];

  window.KPR_FITNESS_DATA = { MUSCLES, EQUIPMENT, CATEGORIES, TRACKS, LIST, BY_ID, ROUTINES, GOALS, DEMOS, slug };
})();
