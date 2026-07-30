# Google Form Column Names Reference

## What Column Names Work?

The system is **flexible** with column names. It searches for keywords in the headers.

### ✅ ACCEPTED Column Names

#### For Email (REQUIRED)
Any of these will work:
- `email`
- `Email Address`
- `E-mail`
- `Email (required)`
- `Your Email`
- `Applicant Email`
- `Contact Email`
- Or any header containing: "email" or "mail"

#### For Name (REQUIRED)
Any of these will work:
- `name`
- `Name`
- `Full Name`
- `Full name`
- `Candidate Name`
- `Applicant Name`
- `Your Name`
- Or any header containing: "name"

#### For Phone (OPTIONAL)
Any of these will work:
- `phone`
- `Phone`
- `Phone Number`
- `Mobile`
- `Contact Number`
- `Telephone`
- Or any header containing: "phone" or "contact"

#### For Education (OPTIONAL)
Any of these will work:
- `education`
- `Education`
- `School`
- `University`
- `Degree`
- `Educational Background`
- `Current Education`
- Or any header containing: "education", "school", or "university"

#### For Skills (OPTIONAL)
Any of these will work:
- `skills`
- `Skills`
- `Technical Skills`
- `Skill`
- `Your Skills`
- `Expertise`
- Or any header containing: "skill"

#### For Portfolio (OPTIONAL)
Any of these will work:
- `portfolio`
- `Portfolio`
- `LinkedIn`
- `LinkedIn URL`
- `Website`
- `GitHub`
- `GitHub URL`
- `GitHub Profile`
- `Personal Website`
- Or any header containing: "portfolio", "linkedin", "website", or "github"

#### For Resume (OPTIONAL)
Any of these will work:
- `resume`
- `Resume`
- `CV`
- `Resume Upload`
- `Resume File`
- `Curriculum Vitae`
- Or any header containing: "resume", "cv", or "upload"

#### For Cover Letter (OPTIONAL)
Any of these will work:
- `cover letter`
- `Cover Letter`
- `Why are you interested?`
- `Tell us about yourself`
- `Purpose Statement`
- `Motivation`
- `Letter`
- Or any header containing: "cover", "letter", "purpose", or "statement"

#### For Position (OPTIONAL)
Any of these will work:
- `position`
- `Position`
- `Job`
- `Job Title`
- `Role`
- `Which internship?`
- `Which position are you interested in?`
- `Select a role`
- Or any header containing: "position", "job", "role", or "interest"

---

## 🎯 Recommended Google Form Setup

### Form Question 1: Name
**Question:** What is your full name?
**Type:** Short answer
**Google Sheet Column:** `Name` ✅

### Form Question 2: Email
**Question:** What is your email address?
**Type:** Email
**Google Sheet Column:** `Email` ✅

### Form Question 3: Phone
**Question:** What is your phone number?
**Type:** Short answer
**Google Sheet Column:** `Phone` ✅

### Form Question 4: Education
**Question:** What is your current education?
**Type:** Short answer
**Google Sheet Column:** `Education` ✅

### Form Question 5: Skills
**Question:** What are your main skills and technologies?
**Type:** Paragraph
**Google Sheet Column:** `Skills` ✅

### Form Question 6: Portfolio
**Question:** Share your LinkedIn profile or portfolio website:
**Type:** URL
**Google Sheet Column:** `Portfolio` ✅

### Form Question 7: Resume
**Question:** Upload your resume:
**Type:** File upload
**Google Sheet Column:** `Resume` ✅

### Form Question 8: Position
**Question:** Which internship position are you interested in?
**Type:** Multiple choice
**Options:**
- React Frontend Developer
- Product Manager Internship  
- ML Research Intern
**Google Sheet Column:** `Position` ✅

### Form Question 9: Cover Letter
**Question:** Why are you interested in this internship?
**Type:** Paragraph
**Google Sheet Column:** `Cover Letter` ✅

---

## ❌ Column Names That WON'T WORK

These are too vague and will fail:

| ❌ BAD | ✅ GOOD |
|--------|---------|
| `Q1` | `Name` |
| `First` | `Full Name` |
| `Contact` | `Phone` or `Email` |
| `School Years` | `Education` |
| `Tech` | `Skills` |
| `Link` | `Portfolio` |
| `File` | `Resume` |
| `Text` | `Cover Letter` |
| `Choice` | `Position` |

**Reason:** Column must clearly indicate which type of data it contains.

---

## Advanced: Custom Column Names

If your form has different column names, here's how they map:

**System searches for these keywords (case-insensitive):**

```javascript
Email:    "email" OR "mail"
Name:     "name"
Phone:    "phone" OR "contact"
Education: "education" OR "school" OR "university"
Skills:   "skill"
Portfolio: "portfolio" OR "linkedin" OR "website" OR "github"
Resume:   "resume" OR "cv" OR "upload"
Cover:    "cover" OR "letter" OR "purpose" OR "statement"
Position: "position" OR "job" OR "role" OR "interest"
Date:     "timestamp"
```

**Examples of custom names that work:**
- `Applicant Full Name` ✅ (contains "name")
- `Please provide your email` ✅ (contains "email")
- `Contact info - phone` ✅ (contains "contact" or "phone")
- `University/Education Background` ✅ (contains "education")
- `List your skills` ✅ (contains "skill")
- `Your GitHub or website` ✅ (contains "github" or "website")
- `Attach your CV/Resume` ✅ (contains "cv" or "resume")
- `Why do you want this role?` ✅ (contains "role")

---

## When Column Names Don't Match

If the system can't find a column:

### What Happens:
- ✅ Email & Name are required → Sync fails if missing
- ✅ Other fields are optional → Skipped if not found
- ✅ Position field is optional → Auto-assigns to "OMAHCONNECT Partner"

### Example:
If you have `Phone #` instead of `Phone`:
- ❌ Won't recognize it (no "phone" keyword)
- ✅ Application still imports
- ✅ Just missing phone number
- ✅ Can update manually later

---

## Testing Your Column Names

### Method 1: Export CSV
1. In Google Sheet, go to File → Download → CSV
2. Open in text editor
3. Check first row for column headers
4. Compare with keywords above

### Method 2: Use These Exact Names
Just use these 9 column names - guaranteed to work:
1. `Name`
2. `Email`
3. `Phone`
4. `Education`
5. `Skills`
6. `Portfolio`
7. `Resume`
8. `Cover Letter`
9. `Position`

---

## Pro Tips

✅ **Use simple, clear column names**
- Good: `Email`, `Name`, `Skills`
- Bad: `Q1`, `Resp A`, `Form Field 1`

✅ **Avoid special characters**
- Good: `Phone`, `LinkedIn`
- Bad: `Phone #`, `Linked-In`, `PHONE!`

✅ **Use consistent capitalization**
- `Email` (capital E) or `email` (lowercase) both work
- System is case-insensitive

✅ **One piece of data per column**
- Good: Separate `Phone` and `Email` columns
- Bad: `Phone/Email` in one column

✅ **No extra spaces in headers**
- Good: `Cover Letter`
- Bad: ` Cover Letter ` (spaces at ends)
- The system trims spaces, but better to avoid

---

## Real World Examples

### Example 1: Simple Form
```
Timestamp | Name | Email | Phone | Position
2026-06-13 08:00 | Muneeb Shoaib | muneeb@example.com | 555-1234 | React Developer
2026-06-13 09:30 | Sarah Khan | sarah@example.com | 555-5678 | Product Manager
```
✅ All column names recognized!

### Example 2: Detailed Form
```
Timestamp | Full Name | Email Address | Phone Number | University | Skills | GitHub | Resume Link | Why interested?
...
```
✅ All column names recognized!

### Example 3: Mixed Format
```
Timestamp | applicant_name | applicant@email.com | contact_phone | education_background | technical_skills | portfolio_url | resume_file | role_interest
...
```
✅ All column names recognized (flexible matching)!

---

## Column Not Found? Here's What to Do

1. **Check column exists in Google Sheet**
   - Verify it's not empty
   - Check for typos

2. **Verify column header format**
   - Compare with suggested names above
   - Make sure it contains one of the keywords

3. **Check for extra spaces**
   - In Google Sheets, double-click column header
   - Trim any leading/trailing spaces

4. **If still issues, rename to simple name**
   - `Full Name` → `Name`
   - `Email Address` → `Email`
   - `Phone Number` → `Phone`

5. **Try syncing again**
   - Sometimes Google takes time to publish

---

**Your Google Form column names should now work perfectly! 🎉**
