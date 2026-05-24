export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

const SEED_DATA = [
  {
    name: 'Flabs Foundational Course',
    departments: ['Sales', 'Support'],
    order_index: 1,
    chapters: [
      {
        name: 'Registration',
        order_index: 1,
        topics: [
          { name: 'Registration Setup (Add fields according to business needs)', youtube_url: 'https://youtu.be/wxLis05UPEM', order_index: 1 },
          { name: 'Patient Registration With Referral Doctor and Multiple Rate List', youtube_url: 'https://youtu.be/YPGb0S0HpJQ', order_index: 2 },
          { name: 'Patient Registration With Government Panel', youtube_url: 'https://youtu.be/GravEySEs7E', order_index: 3 },
          { name: 'Patient Registration With B2B', youtube_url: 'https://youtu.be/8L4lJwCRlhc', order_index: 4 },
          { name: 'Bulk Registration for Camp', youtube_url: 'https://youtu.be/VdWtJ-dmvcM', order_index: 5 },
          { name: 'Quotation Creation', youtube_url: 'https://youtu.be/RIX1FA8i-j8', order_index: 6 },
          { name: 'Add Outsource Lab and Map Test', youtube_url: 'https://youtu.be/_wiI4Vb1Y_4', order_index: 7 },
          { name: 'Old Patient Registration', youtube_url: 'https://youtu.be/VF8DOAVY3gg', order_index: 8 },
          { name: 'How to enable barcode?', youtube_url: 'https://youtu.be/6_Cogqgc7b0', order_index: 9 },
        ],
      },
      {
        name: 'Reporting',
        order_index: 2,
        topics: [
          { name: 'Patient Wise Reporting', youtube_url: 'https://youtu.be/1ZhAoRWpmB0', order_index: 1 },
          { name: 'Test Wise Reporting', youtube_url: 'https://youtu.be/c5mPnSHua4w', order_index: 2 },
          { name: 'Multi Stage Verification: Technician Verification - Doctor Approval', youtube_url: 'https://youtu.be/gj3oezHxec4', order_index: 3 },
          { name: 'Report Version History', youtube_url: 'https://youtu.be/RjGw9FiSkBg', order_index: 4 },
          { name: 'How to do Re-Run', youtube_url: 'https://youtu.be/_DEnr9ft3D8', order_index: 5 },
          { name: 'Select Signature on Report', youtube_url: 'https://youtu.be/p6aJo9CbwkE', order_index: 6 },
        ],
      },
      {
        name: 'Patient List & Report Share',
        order_index: 3,
        topics: [
          { name: 'Bill Edit', youtube_url: 'https://youtu.be/9XSnh8jPtAU', order_index: 1 },
          { name: 'Bill Delete', youtube_url: 'https://youtu.be/BIaJCzE1XAM', order_index: 2 },
          { name: 'Edit Patient/Registration Details', youtube_url: 'https://youtu.be/wKBFn-zfuUM', order_index: 3 },
          { name: 'TRF Print', youtube_url: 'https://youtu.be/ApIgptqsGbY', order_index: 4 },
          { name: 'Change B2B', youtube_url: 'https://youtu.be/xHJgzhHGosw', order_index: 5 },
          { name: 'Download Worksheet', youtube_url: 'https://youtu.be/ZFdfpcgNbT4', order_index: 6 },
          { name: 'Bulk Download', youtube_url: 'https://youtu.be/oPfXTWoLfiw', order_index: 7 },
          { name: 'Download Consolidated Report (Test Result in Excel)', youtube_url: 'https://youtu.be/2WBKcDBlht4', order_index: 8 },
          { name: 'Bulk Due Clear, Used by Hospital Labs', youtube_url: 'https://youtu.be/PLgPFtQ7CFM', order_index: 9 },
          { name: 'Manual WhatsApp', youtube_url: 'https://youtu.be/Ce2SruQzYUU', order_index: 10 },
          { name: 'Share With Referral Doctor', youtube_url: 'https://youtu.be/fXjPPvcr4Ok', order_index: 11 },
          { name: 'WhatsApp API, SMS, Email', youtube_url: 'https://youtu.be/fbyEpqH-BiE', order_index: 12 },
          { name: 'Bulk Report Share', youtube_url: 'https://youtu.be/nTBATUMdSy8', order_index: 13 },
        ],
      },
      {
        name: 'Financial Analysis',
        order_index: 4,
        topics: [
          { name: 'Billing Wise, Collection Wise Difference and Use Case', youtube_url: 'https://youtu.be/kLwWzcajCI0', order_index: 1 },
          { name: 'Create Referral Doctor Report', youtube_url: 'https://youtu.be/30ie7cIIIv8', order_index: 2 },
          { name: 'Clubbing For Referrals', youtube_url: 'https://youtu.be/LK3KPRjcGys', order_index: 3 },
          { name: 'Create Hospital Report', youtube_url: 'https://youtu.be/1LVGIwI4SWo', order_index: 4 },
          { name: 'Fix the column according business needs', youtube_url: 'https://youtu.be/PQprfIvHpi4', order_index: 5 },
          { name: 'Export Excel and PDF Report', youtube_url: 'https://youtu.be/7PBsL5QR5II', order_index: 6 },
          { name: 'Summary Reports: Use-case', youtube_url: 'https://youtu.be/nxSUUgRApOw', order_index: 7 },
          { name: 'Create custom tabs according to business needs', youtube_url: 'https://youtu.be/egRfrLXF3_4', order_index: 8 },
        ],
      },
      {
        name: 'Report PDF Setup',
        order_index: 5,
        topics: [
          { name: 'Add Letterhead', youtube_url: 'https://youtu.be/hTgHZwwXEeg', order_index: 1 },
          { name: 'Add Signatures', youtube_url: 'https://youtu.be/8fyoMhCkjOc', order_index: 2 },
          { name: 'Add NABL Logo Test Wise or Parameter Wise', youtube_url: 'https://youtu.be/XdjWc70ZEb8', order_index: 3 },
          { name: 'Test Sequence Setup', youtube_url: 'https://youtu.be/qVLYbzpFPV8', order_index: 4 },
          { name: 'Report With or Without Letterhead, Separate Department, Separate Test', youtube_url: 'https://youtu.be/zaQuzwG-CN8', order_index: 5 },
          { name: 'Change Report Date and Time Test Wise', youtube_url: 'https://youtu.be/tE6xoZMuLOM', order_index: 6 },
          { name: 'Report View Change (Font, Spacing, QR Position, Test Wise Change)', youtube_url: 'https://youtu.be/5EMlAZQPOQ0', order_index: 7 },
        ],
      },
      {
        name: 'Bill Setup',
        order_index: 6,
        topics: [
          { name: 'Bill Setup (Add letterhead, add signature, add billed by, Bill Size A4 or A5)', youtube_url: 'https://youtu.be/iSnfsebW5Ts', order_index: 1 },
          { name: 'Add Barcode, Package Tests', youtube_url: 'https://youtu.be/efNdXlk8Z1Q', order_index: 2 },
          { name: 'QR code for report download and tracking', youtube_url: 'https://youtu.be/0ys52zwr29s', order_index: 3 },
        ],
      },
    ],
  },
  {
    name: 'Flabs Advanced Modules',
    departments: ['Sales', 'Support'],
    order_index: 2,
    chapters: [
      {
        name: 'Accession',
        order_index: 1,
        topics: [
          { name: 'Lab Receive + Department Receive - 2 Stage', youtube_url: 'https://youtu.be/sI7CaKut24M', order_index: 1 },
          { name: 'Lab Receive only - 1 Stage', youtube_url: 'https://youtu.be/zNbmSjv0JL0', order_index: 2 },
          { name: 'At time of registration accession', youtube_url: 'https://youtu.be/dRzYWWMkt4k', order_index: 3 },
          { name: 'Accession With Barcode Scan', youtube_url: 'https://youtu.be/ESIDPHMjY3w', order_index: 4 },
          { name: 'Reject Sample, Send for Recollection', youtube_url: 'https://youtu.be/LWgVXrUDhPw', order_index: 5 },
        ],
      },
      {
        name: 'B2B Management',
        order_index: 2,
        topics: [
          { name: 'How to create a B2B Lab', youtube_url: 'https://youtu.be/ExgXt-SoI20', order_index: 1 },
          { name: 'Set a rate list to B2B Lab', youtube_url: 'https://youtu.be/9uf2ouf9Pc8', order_index: 2 },
          { name: 'B2B Lab Dashboard Walkthrough', youtube_url: 'https://youtu.be/NxV3GeWD7Ik', order_index: 3 },
          { name: 'Create B2B Invoice', youtube_url: 'https://youtu.be/ZkGB5iqOsHI', order_index: 4 },
          { name: 'Track and Add Manual B2B Payments', youtube_url: 'https://youtu.be/nQ-qXIKtfkw', order_index: 5 },
          { name: 'Add Lab Details on B2B Invoice', youtube_url: 'https://youtu.be/gvA1JNR4lYU', order_index: 6 },
          { name: 'B2B Lab Permissions', youtube_url: 'https://youtu.be/_bMTNlmjiQU', order_index: 7 },
        ],
      },
      {
        name: 'Lab Users',
        order_index: 3,
        topics: [
          { name: 'Create users by role: Admin, Manager, Receptionist, Doctor, Technician', youtube_url: 'https://youtu.be/wlR4AAv9ZBM', order_index: 1 },
          { name: 'User Permissions', youtube_url: 'https://youtu.be/Ci8NltN0C5Y', order_index: 2 },
        ],
      },
      { name: 'Quality Control', order_index: 4, topics: [] },
      { name: 'Inventory Management', order_index: 5, topics: [] },
      { name: 'TAT Analysis', order_index: 6, topics: [] },
    ],
  },
]

export async function POST(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error
  const adminId = auth.user!.sub

  const { rows: existing } = await db.query(
    `SELECT id FROM training_courses WHERE name = 'Flabs Foundational Course' LIMIT 1`
  )
  if (existing.length > 0) {
    return NextResponse.json({ message: 'Already seeded' })
  }

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    let totalTopics = 0

    for (const course of SEED_DATA) {
      const { rows: [c] } = await client.query(
        `INSERT INTO training_courses (name, departments, order_index, created_by)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [course.name, course.departments, course.order_index, adminId]
      )
      for (const chapter of course.chapters) {
        const { rows: [ch] } = await client.query(
          `INSERT INTO training_chapters (course_id, name, order_index) VALUES ($1, $2, $3) RETURNING id`,
          [c.id, chapter.name, chapter.order_index]
        )
        for (const topic of chapter.topics) {
          await client.query(
            `INSERT INTO training_topics (chapter_id, name, youtube_url, order_index) VALUES ($1, $2, $3, $4)`,
            [ch.id, topic.name, topic.youtube_url, topic.order_index]
          )
          totalTopics++
        }
      }
    }

    await client.query('COMMIT')
    return NextResponse.json({ message: 'Seeded successfully', courseCount: SEED_DATA.length, topicCount: totalTopics }, { status: 201 })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
