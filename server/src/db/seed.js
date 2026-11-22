import bcrypt from 'bcryptjs';
import { adminPool } from './admin.js';

const PASSWORD = 'Password123!';
const reset = process.argv.includes('--reset');

// booking tuple: [title, client, email, dayOffset, startHourUTC, minutes, status, notes]
const orgs = [
  {
    name: 'Brightside Dental', slug: 'brightside-dental', plan: 'pro', timezone: 'America/New_York',
    users: [
      ['Maya Okafor', 'owner@brightside.test', 'owner'],
      ['Luis Ortega', 'admin@brightside.test', 'admin'],
      ['Priya Nair', 'frontdesk@brightside.test', 'member'],
    ],
    bookings: [
      ['Routine cleaning', 'Hannah Brooks', 'hannah.brooks@example.com', 1, 14, 60, 'confirmed', 'Prefers morning slots.'],
      ['Crown fitting', 'Daniel Reyes', 'd.reyes@example.com', 1, 16, 90, 'confirmed', 'Second visit. Bring shade chart.'],
      ['New patient exam', 'Sofia Lindqvist', 'sofia.l@example.com', 2, 15, 45, 'pending', 'Insurance details to confirm.'],
      ['Whitening consult', 'Marcus Webb', 'marcus.webb@example.com', 3, 17, 30, 'confirmed', ''],
      ['Root canal follow-up', 'Aisha Rahman', 'aisha.r@example.com', 4, 14, 45, 'cancelled', 'Patient rescheduled by phone.'],
    ],
  },
  {
    name: 'Northwind Physio', slug: 'northwind-physio', plan: 'enterprise', timezone: 'Europe/London',
    users: [
      ['Tom Ashworth', 'owner@northwind.test', 'owner'],
      ['Chloe Barnes', 'admin@northwind.test', 'admin'],
      ['Ravi Patel', 'therapist@northwind.test', 'member'],
    ],
    bookings: [
      ['Initial assessment', 'Oliver Grant', 'oliver.grant@example.com', 1, 9, 60, 'confirmed', 'Lower back pain, 3 weeks.'],
      ['Sports rehab', 'Emma Clarke', 'emma.clarke@example.com', 1, 11, 45, 'confirmed', 'ACL recovery, week 8.'],
      ['Shoulder mobility', 'Noah Fischer', 'noah.f@example.com', 2, 10, 45, 'pending', ''],
      ['Posture workshop', 'Team Halden Ltd', 'hr@halden.example.com', 5, 13, 120, 'confirmed', '12 attendees. Projector needed.'],
      ['Follow-up session', 'Grace Mwangi', 'grace.m@example.com', 3, 15, 30, 'confirmed', ''],
    ],
  },
  {
    name: 'Atlas Coworking', slug: 'atlas-coworking', plan: 'free', timezone: 'Asia/Karachi',
    users: [
      ['Sana Malik', 'owner@atlas.test', 'owner'],
      ['Bilal Ahmed', 'admin@atlas.test', 'admin'],
      ['Zara Hussain', 'community@atlas.test', 'member'],
    ],
    bookings: [
      ['Boardroom A', 'Karachi Startups Meetup', 'events@ksm.example.com', 1, 5, 180, 'confirmed', 'Setup 30 min early.'],
      ['Hot desk day pass', 'Farhan Siddiqui', 'farhan.s@example.com', 1, 4, 480, 'confirmed', ''],
      ['Podcast studio', 'Noor Media', 'hello@noormedia.example.com', 2, 8, 120, 'pending', 'Needs two mics.'],
      ['Private office tour', 'Ayesha Tariq', 'ayesha.t@example.com', 3, 6, 30, 'confirmed', ''],
      ['Workshop room', 'Design Circle', 'organizers@designcircle.example.com', 6, 9, 240, 'cancelled', 'Venue changed.'],
    ],
  },
];

async function main() {
  const client = await adminPool.connect();
  try {
    if (reset) await client.query('TRUNCATE tenants CASCADE');
    const { rows } = await client.query('SELECT count(*)::int AS n FROM tenants');
    if (rows[0].n > 0) {
      console.log('Seed skipped: tenants already exist. Use `npm run seed:reset` to start fresh.');
      return;
    }

    const hash = await bcrypt.hash(PASSWORD, 10);
    await client.query('BEGIN');
    for (const org of orgs) {
      const t = await client.query(
        'INSERT INTO tenants (name, slug, plan, timezone) VALUES ($1,$2,$3,$4) RETURNING id',
        [org.name, org.slug, org.plan, org.timezone]);
      const tenantId = t.rows[0].id;

      const roleIds = {};
      for (const [name, description] of [
        ['owner', 'Full access, billing and organization settings'],
        ['admin', 'Manage bookings, team members and settings'],
        ['member', 'Create and edit bookings'],
      ]) {
        const r = await client.query(
          'INSERT INTO roles (tenant_id, name, description) VALUES ($1,$2,$3) RETURNING id',
          [tenantId, name, description]);
        roleIds[name] = r.rows[0].id;
      }

      const userIds = [];
      for (const [name, email, role] of org.users) {
        const u = await client.query(
          'INSERT INTO users (tenant_id, role_id, email, name, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id',
          [tenantId, roleIds[role], email, name, hash]);
        userIds.push(u.rows[0].id);
      }

      for (const [i, [title, client_name, email, day, hour, mins, status, notes]] of org.bookings.entries()) {
        const start = new Date();
        start.setUTCDate(start.getUTCDate() + day);
        start.setUTCHours(hour, 0, 0, 0);
        const end = new Date(start.getTime() + mins * 60_000);
        await client.query(
          `INSERT INTO bookings (tenant_id, created_by, title, client_name, client_email, starts_at, ends_at, status, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [tenantId, userIds[i % userIds.length], title, client_name, email, start, end, status, notes]);
      }
      console.log(`✔ seeded ${org.name} (${org.users.length} users, ${org.bookings.length} bookings)`);
    }
    await client.query('COMMIT');
    console.log(`\nAll seeded accounts use the password: ${PASSWORD}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await adminPool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
