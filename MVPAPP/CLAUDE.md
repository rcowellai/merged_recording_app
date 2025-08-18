


- Critical Firebase Deployment Rules

  NEVER use firebase deploy --only functions on shared projects - it deletes ALL functions not in your local directory.

  Safe function deployment:
  # Deploy specific function only
  firebase deploy --only functions:functionName

  # Deploy multiple specific functions
  firebase deploy --only functions:function1,functions:function2

  NEVER use --force flag without understanding it bypasses safety checks and deletes production resources.

  Before ANY production deployment:
  1. List existing functions: firebase functions:list
  2. Deploy only YOUR specific functions by name
  3. Never deploy all functions unless you have the complete source code

  When working on shared Firebase projects:
  - You're likely working with a subset of functions
  - The main app has functions you don't have locally
  - Deploying "all functions" will delete what's not in your directory

  Red flags to stop immediately:
  - "The following functions are found in your project but do not exist in your local source code"
  - "Aborting because deletion cannot proceed"
  - Any mention of deleting functions you didn't create

  Simple rule: If you didn't create it, don't delete it.

- Critical Firestore Rules Synchronization Protocol

  ⚠️ CRITICAL: ALWAYS ASK BEFORE MODIFYING firestore.rules

  This is a SHARED Firebase project between two teams:
  - Love Retold Main App Team (owns main app collections)
  - Recording App Team (owns recording-related collections)

  BEFORE ANY firestore.rules CHANGES:
  1. ❌ NEVER modify firestore.rules without first asking
  2. ✅ ALWAYS ask: "Do you have the latest firestore.rules from the Love Retold platform?"
  3. ✅ ALWAYS ask: "Has the Love Retold team made any recent rule changes?"
  4. ✅ ALWAYS explain what changes you plan to make and why
  5. ✅ ALWAYS wait for explicit confirmation before proceeding

  The master rules file is: firestore-merged.rules
  - This contains rules for BOTH teams
  - Any changes must preserve both teams' rules
  - Missing rules will break production apps

  SYNC ISSUES TO AVOID:
  - Overwriting Love Retold team's rules → Their app breaks
  - Using outdated rules → Recording app features fail
  - Deploying partial rules → Production outages

  CORRECT WORKFLOW:
  1. Ask user to confirm they have latest rules
  2. Request to see current firestore.rules content
  3. Compare with firestore-merged.rules
  4. Explain planned changes
  5. Get explicit approval
  6. Make changes preserving both teams' sections
  7. Update firestore-merged.rules as single source of truth

  Remember: This project caused production outages when rules were overwritten.
  Always coordinate before making any Firestore rules changes.