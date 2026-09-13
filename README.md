# TaskFlow — Οργάνωση Εργασιών + Ομαδικό Chat

Πλήρης εφαρμογή με:
- **Login / εγγραφή χρηστών** (username, email, password) με πραγματικό hashing (bcrypt) και JWT authentication
- **Διαχείριση εργασιών** (τίτλος, περιγραφή, ημερομηνία λήξης, προτεραιότητα, κατάσταση, ανάθεση σε χρήστη)
- **Ομαδικό chat σε πραγματικό χρόνο** μέσω Socket.io, ανάμεσα σε όλους τους συνδεδεμένους χρήστες
- **Πραγματική βάση δεδομένων** (PostgreSQL, φιλοξενούμενη δωρεάν στο [Neon.tech](https://neon.tech))

---

## 1. Δομή του project

```
taskapp/
├── backend/
│   ├── server.js          # Κεντρικός Express server + Socket.io
│   ├── db/init.js         # Δημιουργία SQLite βάσης και πινάκων
│   ├── middleware/auth.js # Επαλήθευση JWT
│   ├── routes/
│   │   ├── auth.js        # /api/auth/register, /login, /me
│   │   ├── users.js       # /api/users
│   │   ├── tasks.js       # /api/tasks (CRUD)
│   │   └── chat.js        # /api/chat/messages (ιστορικό)
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/{api.js, app.js}
```

Το backend σερβίρει επίσης το frontend σαν στατικά αρχεία, οπότε όλη η εφαρμογή τρέχει από ένα μόνο process.

---

## 2. Δημιουργία δωρεάν βάσης δεδομένων στο Neon

1. Πήγαινε στο [neon.tech](https://neon.tech) και κάνε δωρεάν εγγραφή.
2. Δημιούργησε ένα νέο project (π.χ. "taskflow").
3. Στο dashboard του project, βρες την ενότητα **"Connection Details"** (ή "Connection string").
4. Αντίγραψε το connection string — έχει τη μορφή:
   ```
   postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require
   ```
   Αυτό θα το χρειαστείς στο επόμενο βήμα.

Οι πίνακες της βάσης (users, tasks, messages) δημιουργούνται **αυτόματα** την πρώτη φορά που ξεκινά ο server — δεν χρειάζεται να τρέξεις SQL χειροκίνητα.

## 3. Τοπική εκτέλεση (στον υπολογιστή σου) — προαιρετικό

Χρειάζεσαι [Node.js](https://nodejs.org) (έκδοση 18 ή νεότερη).

```bash
cd taskapp/backend
npm install
cp .env.example .env
# Άνοιξε το .env, βάλε το DATABASE_URL από το Neon και άλλαξε το JWT_SECRET
npm start
```

Μετά άνοιξε στο browser: **http://localhost:4000**

- Ο **πρώτος** χρήστης που θα κάνει εγγραφή γίνεται αυτόματα `admin`.
- Κάθε επόμενος χρήστης εγγράφεται σαν `member`.

---

## 3. Πώς δουλεύει η ασφάλεια

- Οι κωδικοί **δεν** αποθηκεύονται ποτέ σε απλό κείμενο — γίνονται hash με bcrypt πριν μπουν στη βάση.
- Η σύνδεση χρησιμοποιεί **JWT tokens** που λήγουν μετά από 7 μέρες (ρυθμίζεται στο `.env`).
- Το real-time chat απαιτεί έγκυρο token και στο socket handshake, όχι μόνο στο REST API.

⚠️ Πριν βάλεις την εφαρμογή σε πραγματική (production) χρήση:
1. Άλλαξε το `JWT_SECRET` σε κάτι μεγάλο και τυχαίο.
2. Ενεργοποίησε HTTPS (π.χ. μέσω του hosting provider σου).
3. Περιόρισε το CORS (`origin: '*'` στο `server.js`) στο πραγματικό domain σου.
4. Σκέψου rate-limiting στα endpoints `/api/auth/*` για προστασία από brute-force.

---

## 4. Πώς να το ανεβάσεις online (deployment)

Επειδή η βάση δεδομένων είναι πλέον στο Neon (εξωτερική, μόνιμη), **δεν χρειάζεται persistent disk** στο hosting — οπότε δουλεύει και στο δωρεάν πλάνο του Render.

### Render.com (δωρεάν)
1. Ανέβασε τον φάκελο `taskapp` σε ένα GitHub repository.
2. Στο Render, δημιούργησε νέο **Web Service**, σύνδεσέ το με το repo.
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Στα **Environment Variables** πρόσθεσε:
   - `DATABASE_URL` = το connection string που πήρες από το Neon
   - `JWT_SECRET` = μια τυχαία μεγάλη σειρά χαρακτήρων
7. Πάτα **Create Web Service** και περίμενε το deploy.

Δεν χρειάζεται καθόλου η ενότητα "Disks" — μπορείς να την προσπεράσεις εντελώς.

### Εναλλακτικά: Railway.app ή VPS
Η ίδια λογική ισχύει — αρκεί να δώσεις το `DATABASE_URL` και το `JWT_SECRET` σαν environment variables, όπου κι αν φιλοξενήσεις το backend.

---

## 5. API Reference (σύντομα)

| Method | Endpoint | Auth | Περιγραφή |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Εγγραφή (username, email, password) |
| POST | `/api/auth/login` | ❌ | Σύνδεση (email, password) → token |
| GET | `/api/auth/me` | ✅ | Στοιχεία συνδεδεμένου χρήστη |
| GET | `/api/users` | ✅ | Λίστα όλων των χρηστών |
| GET | `/api/tasks` | ✅ | Λίστα εργασιών (με filters: status, assigned_to, from, to) |
| POST | `/api/tasks` | ✅ | Δημιουργία εργασίας |
| PUT | `/api/tasks/:id` | ✅ | Ενημέρωση εργασίας |
| DELETE | `/api/tasks/:id` | ✅ | Διαγραφή εργασίας |
| GET | `/api/chat/messages` | ✅ | Ιστορικό chat (τελευταία 100 μηνύματα) |
| Socket.io event | `chat:send` → `chat:message` | ✅ (token στο handshake) | Real-time μηνύματα |

---

## 6. Επόμενα βήματα / ιδέες επέκτασης

- Ειδοποιήσεις email όταν σου ανατεθεί εργασία
- Πραγματικό μηνιαίο ημερολόγιο (grid view) αντί για λίστα
- Ρόλοι/δικαιώματα πιο λεπτομερή (π.χ. μόνο ο admin διαγράφει εργασίες άλλων)
- "AI προτάσεις" μέσα στο chat: ένα bot account που προτείνει προτεραιοποίηση εργασιών (μπορεί να προστεθεί σαν ξεχωριστό service που καλεί το Anthropic API και στέλνει μηνύματα σαν ειδικός χρήστης "assistant")
