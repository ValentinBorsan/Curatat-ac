require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { createClient } = require('@supabase/supabase-js');
const pg = require('pg');

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
app.set('trust proxy', 1);
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    store: new pgSession({
        pool: new pg.Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { 
                require: true, 
                rejectUnauthorized: false 
            }
        }),
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'secret-key-super-secure',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production'
    }
}));
// Middleware de verificare autentificare
const requireAuth = (req, res, next) => {
    if (req.session.isAdmin) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Helper: convertește array de settings în obiect
function settingsToObject(settingsArray) {
    const obj = {};
    if (settingsArray) {
        settingsArray.forEach(s => {
            obj[s.key] = s.value;
        });
    }
    return obj;
}

// --- RUTE PUBLICE ---

// Health check endpoint pentru keep-alive
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/', async (req, res) => {
    const { data: services } = await supabase.from('services').select('*').order('id');
    const { data: testimonials } = await supabase.from('testimonials').select('*').order('id');
    const { data: gallery } = await supabase.from('gallery').select('*').order('id', { ascending: false });
    const { data: benefits } = await supabase.from('benefits').select('*').order('id');
    const { data: settingsData } = await supabase.from('settings').select('*');

    const settings = settingsToObject(settingsData);

    res.render('index', {
        title: `${settings.site_name || 'Curățare AC'} - Servicii Profesionale de Curățare Aer Condiționat în Galați`,
        settings,
        services: services || [],
        testimonials: testimonials || [],
        gallery: gallery || [],
        benefits: benefits || []
    });
});
// --- RUTE ADMIN ---

// Pagina Login
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    if (req.body.password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.redirect('/admin');
    } else {
        res.render('login', { error: "Parolă incorectă!" });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Dashboard Admin - Versiune cu Debugging
app.get('/admin', requireAuth, async (req, res) => {
    console.log("--- Începere încărcare Dashboard Admin ---");

    // 1. Fetch Services
    const { data: services, error: errServices } = await supabase.from('services').select('*').order('id');
    if (errServices) console.error("Eroare Servicii:", errServices);
    else console.log(`Servicii găsite: ${services?.length}`);

    // 2. Fetch Testimonials
    const { data: testimonials, error: errTestim } = await supabase.from('testimonials').select('*').order('id');
    if (errTestim) console.error("Eroare Testimoniale:", errTestim);

    // 3. Fetch Gallery
    const { data: gallery, error: errGallery } = await supabase.from('gallery').select('*').order('id', { ascending: false });
    if (errGallery) console.error("Eroare Galerie:", errGallery);

    // 4. Fetch Benefits
    const { data: benefits, error: errBenefits } = await supabase.from('benefits').select('*').order('id');
    if (errBenefits) console.error("Eroare Beneficii:", errBenefits);

    // 5. Fetch Settings
    const { data: settingsData, error: errSettings } = await supabase.from('settings').select('*');
    if (errSettings) console.error("Eroare Setări:", errSettings);

    const settings = settingsToObject(settingsData);

    // Randare cu protecție la null (|| [])
    res.render('admin', { 
        services: services || [], 
        testimonials: testimonials || [], 
        gallery: gallery || [], 
        benefits: benefits || [], 
        settings 
    });
});
app.post('/admin/save-gallery', requireAuth, async (req, res) => {
    const { id, image_url, caption, action } = req.body;

    if (action === 'delete') {
        await supabase.from('gallery').delete().eq('id', id);
    } else if (id) {
        await supabase.from('gallery').update({ image_url, caption }).eq('id', id);
    } else {
        await supabase.from('gallery').insert([{ image_url, caption }]);
    }
    res.redirect('/admin');
});

// Adăugare/Editare Serviciu
app.post('/admin/save-service', requireAuth, async (req, res) => {
    const { id, icon, title, description, action } = req.body;

    if (action === 'delete') {
        await supabase.from('services').delete().eq('id', id);
    } else if (id) {
        // Update
        await supabase.from('services').update({ icon, title, description }).eq('id', id);
    } else {
        // Insert
        await supabase.from('services').insert([{ icon, title, description }]);
    }
    res.redirect('/admin');
});

// Adăugare/Editare Testimonial
app.post('/admin/save-testimonial', requireAuth, async (req, res) => {
    const { id, client_name, client_type, feedback, rating, action } = req.body;

    if (action === 'delete') {
        await supabase.from('testimonials').delete().eq('id', id);
    } else if (id) {
        await supabase.from('testimonials').update({ client_name, client_type, feedback, rating }).eq('id', id);
    } else {
        await supabase.from('testimonials').insert([{ client_name, client_type, feedback, rating }]);
    }
    res.redirect('/admin');
});

app.post('/admin/save-benefit', requireAuth, async (req, res) => {
    const { id, icon, color, title, description, action } = req.body;

    if (action === 'delete') {
        await supabase.from('benefits').delete().eq('id', id);
    } else if (id) {
        await supabase.from('benefits').update({ icon, color, title, description }).eq('id', id);
    } else {
        await supabase.from('benefits').insert([{ icon, color, title, description }]);
    }
    res.redirect('/admin');
});

// Salvare Settings (Hero, Stats, Contact, Social)
app.post('/admin/save-settings', requireAuth, async (req, res) => {
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
        await supabase
            .from('settings')
            .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }

    res.redirect('/admin');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);

    // Keep-alive: ping la fiecare 14 minute pentru a preveni adormirea pe Render
    if (process.env.RENDER_EXTERNAL_URL) {
        const keepAliveUrl = `${process.env.RENDER_EXTERNAL_URL}/health`;
        setInterval(() => {
            fetch(keepAliveUrl)
                .then(() => console.log(`[Keep-Alive] Ping sent to ${keepAliveUrl}`))
                .catch(err => console.log('[Keep-Alive] Ping failed:', err.message));
        }, 14 * 60 * 1000); // 14 minute
    }
});