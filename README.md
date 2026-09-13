# TaskFlow — Οργάνωση Εργασιών + Ομαδικό Chat

Πλήρης εφαρμογή με:
- **Login / εγγραφή χρηστών** (username, email, password) με πραγματικό hashing (bcrypt) και JWT authentication
- **Διαχείριση εργασιών** (τίτλος, περιγραφή, ημερομηνία λήξης, προτεραιότητα, κατάσταση, ανάθεση σε χρήστη)
- **Ομαδικό chat σε πραγματικό χρόνο** μέσω Socket.io, ανάμεσα σε όλους τους συνδεδεμένους χρήστες
- **Πραγματική βάση δεδομένων** (SQLite — αρχείο, χωρίς ανάγκη εξωτερικού server βάσης)

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

## 2. Τοπική εκτέλεση (στον υπολογιστή σου)

Χρειάζεσαι [Node.js](https://nodejs.org) (έκδοση 18 ή νεότερη).

```bash
cd taskapp/backend
npm install
cp .env.example .env
# Άνοιξε το .env και άλλαξε το JWT_SECRET σε κάτι τυχαίο/μοναδικό
npm start
```

Μετά άνοιξε στο browser: **http://localhost:4000**

- Ο **πρώτος** χρήστης που θα κάνει εγγραφή γίνεται αυτόματα `admin`.
- Κάθε επόμενος χρήστης εγγράφεται σαν `member`.
- Η βάση δεδομένων αποθηκεύεται αυτόματα στο `backend/data/app.db`.

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

Το SQLite είναι απλό αλλά χρειάζεται **persistent disk** (μόνιμο δίσκο) — όχι κάθε δωρεάν hosting το προσφέρει. Προτάσεις:

### Επιλογή Α: Render.com (πιο απλό)
1. Ανέβασε τον φάκελο `taskapp` σε ένα GitHub repository.
2. Στο Render, δημιούργησε νέο **Web Service**, σύνδεσέ το με το repo.
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Πρόσθεσε ένα **Persistent Disk** (π.χ. 1GB) mounted στο `/opt/render/project/src/data`, και όρισε `DB_PATH=/opt/render/project/src/data/app.db` στα environment variables.
7. Όρισε επίσης `JWT_SECRET` σαν environment variable.

### Επιλογή Β: Railway.app
Παρόμοια διαδικασία — Railway προσφέρει persistent volumes εύκολα από το dashboard.

### Επιλογή Γ: VPS (π.χ. DigitalOcean, Hetzner)
Πλήρης έλεγχος: εγκαθιστάς Node.js, τρέχεις την εφαρμογή με `pm2` για να μένει ζωντανή, και βάζεις ένα reverse proxy (nginx) μπροστά με SSL (Let's Encrypt).

Αν στο μέλλον μεγαλώσει η ομάδα και θες κάτι πιο "σοβαρό" από SQLite, μπορείς να αντικαταστήσεις το `better-sqlite3` με PostgreSQL χωρίς να αλλάξεις τη λογική των routes — μόνο το layer του `db/init.js`.

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
