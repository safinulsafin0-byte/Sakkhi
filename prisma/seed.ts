import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const prisma = new PrismaClient();

async function generateDemoReceipt(): Promise<{
  filepath: string;
  filename: string;
  sizeBytes: number;
  sha256Hash: string;
}> {
  const publicDir = path.join(process.cwd(), "public");
  const demoDir = path.join(publicDir, "demo");
  if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
  }

  const filename = "receipt-kurigram-fuel.jpg";
  const filepath = path.join(demoDir, filename);

  const svg = `
  <svg width="800" height="1050" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="1050" fill="#F4EFEA"/>
    <rect x="40" y="40" width="720" height="970" fill="#FAF7F2" stroke="#D1C7BD" stroke-width="2" rx="4"/>
    <line x1="40" y1="95" x2="760" y2="95" stroke="#8C827A" stroke-dasharray="6,6" stroke-width="1.5"/>
    
    <text x="400" y="130" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#8A422D" letter-spacing="2">DEMO ARTIFACT • SAKKHI AI WITNESS ARCHIVE</text>
    <text x="400" y="170" text-anchor="middle" font-family="serif" font-size="28" font-weight="bold" fill="#2C2825">CHILMARI RIVER FUEL DEPOT</text>
    <text x="400" y="198" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#605751">Ghat No. 3, Chilmari Bandar, Kurigram District</text>
    <text x="400" y="222" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#605751">Govt. Registered Fuel &amp; River Relief Supplies</text>
    
    <line x1="80" y1="245" x2="720" y2="245" stroke="#D1C7BD" stroke-width="1"/>
    
    <text x="80" y="275" font-family="sans-serif" font-size="15" font-weight="bold" fill="#2C2825">CASH MEMO / VOUCHER NO: #CM-8842</text>
    <text x="720" y="275" text-anchor="end" font-family="sans-serif" font-size="14" fill="#605751">Date: 27 Oct 2026 | 14:35 BST</text>
    <text x="80" y="305" font-family="sans-serif" font-size="14" fill="#605751">Issued To: Sakkhi Volunteer Relief Unit (Kurigram Flood Mission)</text>
    <text x="80" y="330" font-family="sans-serif" font-size="14" fill="#605751">Authorized Recipient: Rahim Uddin (Volunteer ID: VOL-01)</text>

    <line x1="80" y1="355" x2="720" y2="355" stroke="#2C2825" stroke-width="2"/>
    
    <text x="90" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#2C2825">SL</text>
    <text x="140" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#2C2825">ITEM DESCRIPTION</text>
    <text x="460" y="380" text-anchor="end" font-family="sans-serif" font-size="14" font-weight="bold" fill="#2C2825">QTY / RATE</text>
    <text x="710" y="380" text-anchor="end" font-family="sans-serif" font-size="14" font-weight="bold" fill="#2C2825">AMOUNT (BDT)</text>
    
    <line x1="80" y1="395" x2="720" y2="395" stroke="#D1C7BD" stroke-width="1"/>

    <text x="90" y="430" font-family="sans-serif" font-size="15" fill="#2C2825">01</text>
    <text x="140" y="430" font-family="sans-serif" font-size="15" font-weight="600" fill="#2C2825">High-Speed Diesel (Boat Fuel)</text>
    <text x="140" y="452" font-family="sans-serif" font-size="13" fill="#605751">For 3 Rescue &amp; Relief Engine Boats</text>
    <text x="460" y="430" text-anchor="end" font-family="sans-serif" font-size="15" fill="#2C2825">450 Ltr @ 160 BDT</text>
    <text x="710" y="430" text-anchor="end" font-family="sans-serif" font-size="16" font-weight="bold" fill="#2C2825">72,000</text>

    <text x="90" y="500" font-family="sans-serif" font-size="15" fill="#2C2825">02</text>
    <text x="140" y="500" font-family="sans-serif" font-size="15" font-weight="600" fill="#2C2825">Heavy Duty Food-Grade Jerrycans</text>
    <text x="140" y="522" font-family="sans-serif" font-size="13" fill="#605751">20-Liter Capacity with airtight caps</text>
    <text x="460" y="500" text-anchor="end" font-family="sans-serif" font-size="15" fill="#2C2825">100 Pcs @ 200 BDT</text>
    <text x="710" y="500" text-anchor="end" font-family="sans-serif" font-size="16" font-weight="bold" fill="#2C2825">20,000</text>

    <line x1="80" y1="560" x2="720" y2="560" stroke="#D1C7BD" stroke-width="1"/>

    <text x="460" y="600" text-anchor="end" font-family="sans-serif" font-size="17" font-weight="bold" fill="#2C2825">TOTAL PAID (BDT):</text>
    <text x="710" y="600" text-anchor="end" font-family="serif" font-size="24" font-weight="bold" fill="#8A422D">৳ 92,000</text>
    
    <text x="80" y="640" font-family="sans-serif" font-size="13" font-style="italic" fill="#605751">In Words: Ninety-Two Thousand Bangladeshi Taka Only (Paid in Cash on Delivery)</text>
    
    <g transform="translate(480, 680) rotate(-5)">
      <rect width="210" height="70" fill="#EDF5F0" stroke="#2D5A43" stroke-width="3" rx="8"/>
      <text x="105" y="32" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="bold" fill="#2D5A43" letter-spacing="1">PAID IN FULL</text>
      <text x="105" y="54" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#2D5A43">SAKKHI VERIFIED 28 OCT</text>
    </g>

    <line x1="80" y1="780" x2="720" y2="780" stroke="#D1C7BD" stroke-width="1"/>
    
    <text x="120" y="810" font-family="sans-serif" font-size="13" fill="#605751">Vendor Representative</text>
    <text x="120" y="830" font-family="serif" font-size="16" font-style="italic" fill="#2C2825">Md. Mokhlesur Rahman</text>
    <text x="120" y="848" font-family="sans-serif" font-size="12" fill="#8C827A">Chilmari Fuel Depot</text>

    <text x="450" y="810" font-family="sans-serif" font-size="13" fill="#605751">Field Receiver</text>
    <text x="450" y="830" font-family="serif" font-size="16" font-style="italic" fill="#2C2825">Rahim Uddin</text>
    <text x="450" y="848" font-family="sans-serif" font-size="12" fill="#8C827A">Volunteer ID: VOL-01 (Sakkhi)</text>

    <rect x="70" y="880" width="660" height="95" fill="#EAE5DE" rx="6"/>
    <text x="90" y="905" font-family="sans-serif" font-size="13" font-weight="bold" fill="#2C2825">FORENSIC WITNESS AUDIT METADATA</text>
    <text x="90" y="928" font-family="monospace" font-size="12" fill="#605751">Certificate ID: SKH-20261028-0042  •  Status: CRYPTOGRAPHICALLY VERIFIED</text>
    <text x="90" y="948" font-family="monospace" font-size="12" fill="#605751">GPS Fix: 25.5562° N, 89.6714° E (Kurigram Chilmari Ghat)  •  Tamper Score: 0.01</text>
    <text x="90" y="965" font-family="monospace" font-size="11" fill="#8C827A">Verification Algorithm: Multi-Tier Sakkhi Integrity Standard v1.0</text>
  </svg>
  `;

  const jpegBuffer = await sharp(Buffer.from(svg))
    .jpeg({ quality: 90 })
    .toBuffer();

  fs.writeFileSync(filepath, jpegBuffer);

  const hash = crypto.createHash("sha256").update(jpegBuffer).digest("hex");

  return {
    filepath,
    filename,
    sizeBytes: jpegBuffer.length,
    sha256Hash: hash,
  };
}

async function main() {
  console.log("Starting Sakkhi AI database seeding...");

  // Clean existing data for a fresh, idempotent demo seed
  console.log("Cleaning existing records...");
  await prisma.auditLog.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.mediaFile.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.user.deleteMany();
  await prisma.verificationCase.deleteMany();

  // 1. Generate Demo Receipt Image
  console.log("Generating demo receipt image using Sharp...");
  const receiptImg = await generateDemoReceipt();
  console.log(`Demo receipt generated: ${receiptImg.filename} (${receiptImg.sizeBytes} bytes, SHA-256: ${receiptImg.sha256Hash.slice(0, 12)}...)`);

  // 2. Create Users
  console.log("Creating coordinator, volunteers, and donors...");
  
  // 1 Coordinator
  const coordinator = await prisma.user.create({
    data: {
      name: "Nusrat Jahan",
      email: "nusrat@sakkhiai.org",
      role: "COORDINATOR",
      phone: "+8801711000001",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    },
  });

  // 3 Volunteers
  const volunteer1 = await prisma.user.create({
    data: {
      name: "Rahim Uddin",
      email: "rahim@sakkhiai.org",
      role: "VOLUNTEER",
      phone: "+8801711000002",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
  });

  const volunteer2 = await prisma.user.create({
    data: {
      name: "Salma Khatun",
      email: "salma@sakkhiai.org",
      role: "VOLUNTEER",
      phone: "+8801711000003",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    },
  });

  const volunteer3 = await prisma.user.create({
    data: {
      name: "Tanvir Hasan",
      email: "tanvir@sakkhiai.org",
      role: "VOLUNTEER",
      phone: "+8801711000004",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    },
  });

  // 4 Donors
  const donor1 = await prisma.user.create({
    data: {
      name: "Arif Ahmed",
      email: "arif.ahmed@example.com",
      role: "DONOR",
      phone: "+8801712000001",
    },
  });

  const donor2 = await prisma.user.create({
    data: {
      name: "Farhana Yasmin",
      email: "farhana.y@example.com",
      role: "DONOR",
      phone: "+8801712000002",
    },
  });

  const donor3 = await prisma.user.create({
    data: {
      name: "Kazi Nazmul",
      email: "kazi.nazmul@example.com",
      role: "DONOR",
      phone: "+8801712000003",
    },
  });

  const donor4 = await prisma.user.create({
    data: {
      name: "Tahsin Karim",
      email: "tahsin.karim@example.com",
      role: "DONOR",
      phone: "+8801712000004",
    },
  });

  // 3. Campaign 1: "Flood relief, Kurigram"
  console.log("Creating Campaign 1: Flood relief, Kurigram...");
  const campaign1 = await prisma.campaign.create({
    data: {
      title: "Flood relief, Kurigram",
      slug: "flood-relief-kurigram",
      location: "Chilmari & Roumari, Kurigram",
      description:
        "Urgent monsoon flood response providing clean drinking water, emergency boat transit fuel, dry rations, and temporary shelter repairs for marooned families along the Brahmaputra basin in Kurigram.",
      targetAmount: 35000000, // 350,000 BDT in poisha
      currency: "BDT",
      status: "ACTIVE",
      coordinatorId: coordinator.id,
    },
  });

  // Campaign 1 - Milestones
  // Milestone 1: VERIFIED and RELEASED (Paid)
  const c1m1 = await prisma.milestone.create({
    data: {
      campaignId: campaign1.id,
      title: "Emergency Boat Fuel & Water Jerrycans",
      description: "Procuring 450 liters of diesel for rescue boats and 120 food-grade 20L water jerrycans for marooned char settlements.",
      order: 1,
      targetAmount: 9200000, // 92,000 BDT in poisha
      status: "RELEASED",
      assignedVolunteerId: volunteer1.id,
      verifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      releasedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      proofChecklist: JSON.stringify([
        "Cash memo receipt from Chilmari river fuel depot",
        "GPS-tagged photos of loaded boat tanks",
        "Handover sign-off from community boatmen",
      ]),
    },
  });

  // Attach MediaFile (Seeded receipt image) to Milestone 1
  const mediaReceipt = await prisma.mediaFile.create({
    data: {
      campaignId: campaign1.id,
      milestoneId: c1m1.id,
      uploaderId: volunteer1.id,
      filename: receiptImg.filename,
      mimeType: "image/jpeg",
      sizeBytes: receiptImg.sizeBytes,
      sha256Hash: receiptImg.sha256Hash,
      storagePath: "/demo/receipt-kurigram-fuel.jpg",
      isReceipt: true,
      caption: "Fuel vendor cash memo #8842 - Chilmari Ghat Depot (92,000 BDT)",
      exifData: JSON.stringify({
        Make: "Samsung",
        Model: "Galaxy A54 5G",
        Software: "OneUI 6.1",
        DateTimeOriginal: "2026-10-27T14:35:12",
        GPSLatitude: [25, 33, 22.32],
        GPSLongitude: [89, 40, 17.04],
      }),
      hasGps: true,
      latitude: 25.5562,
      longitude: 89.6714,
      cameraModel: "Samsung Galaxy A54 5G",
      software: "OneUI Camera",
      captureDate: new Date("2026-10-27T14:35:00Z"),
      tamperScore: 0.01,
      aiSummary: "Authentic physical receipt image. EXIF metadata and GPS fix match the Chilmari river ghat fuel depot. Pristine pixel distribution with no synthetic or AI inpainting artifacts.",
    },
  });

  // Attach Certificate to Milestone 1
  await prisma.certificate.create({
    data: {
      milestoneId: c1m1.id,
      certificateCode: "SKH-20261028-0042",
      signatureHash: receiptImg.sha256Hash,
      issuer: "Sakkhi Witness Authority",
      isRevoked: false,
      issuedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  // Milestone 2: RESERVED
  const c1m2 = await prisma.milestone.create({
    data: {
      campaignId: campaign1.id,
      title: "Dry Rations & Water Purification Tablets",
      description: "Bulk purchase of rice, lentils, chira, molasses, and 10,000 Halazone water purification tablets.",
      order: 2,
      targetAmount: 15000000, // 150,000 BDT in poisha
      status: "RESERVED",
      assignedVolunteerId: volunteer2.id,
      proofChecklist: JSON.stringify([
        "Wholesale purchase voucher from Kurigram Sadar market",
        "Distribution register signed/thumbprinted by 300 heads of household",
        "Geotagged distribution photo from Roumari relief camp",
      ]),
    },
  });

  // Milestone 3: PENDING
  await prisma.milestone.create({
    data: {
      campaignId: campaign1.id,
      title: "Temporary Shelter Tarpaulins & Solar Lamps",
      description: "Heavy-duty UV-resistant tarpaulin sheets and portable solar emergency lamps for flood embankments.",
      order: 3,
      targetAmount: 10800000, // 108,000 BDT in poisha
      status: "PENDING",
      assignedVolunteerId: volunteer3.id,
      proofChecklist: JSON.stringify([
        "Hardware vendor invoice with itemized serials",
        "On-site installation photos at embankment camps",
        "Village disaster management committee counter-signature",
      ]),
    },
  });

  // Campaign 1 - Donations & Ledger Entries
  // Total donated: 50,000 + 100,000 + 120,000 = 270,000 BDT (27,000,000 poisha)
  const donationsC1 = [
    {
      donor: donor1,
      amount: 5000000, // 50,000 BDT
      key: "seed-don-c1-01",
      paypalId: "PAYID-KURIGRAM-001",
    },
    {
      donor: donor2,
      amount: 10000000, // 100,000 BDT
      key: "seed-don-c1-02",
      paypalId: "PAYID-KURIGRAM-002",
    },
    {
      donor: donor3,
      amount: 12000000, // 120,000 BDT
      key: "seed-don-c1-03",
      paypalId: "PAYID-KURIGRAM-003",
    },
  ];

  for (const d of donationsC1) {
    const donation = await prisma.donation.create({
      data: {
        campaignId: campaign1.id,
        donorId: d.donor.id,
        donorName: d.donor.name,
        donorEmail: d.donor.email,
        amount: d.amount,
        currency: "BDT",
        amountUsdCents: Math.round(d.amount / 120), // 1 USD = 120 BDT
        status: "COMPLETED",
        idempotencyKey: d.key,
        paypalOrderId: d.paypalId,
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        campaignId: campaign1.id,
        donationId: donation.id,
        type: "CREDIT_DONATION",
        amount: d.amount,
        currency: "BDT",
        idempotencyKey: d.key,
        description: `Donation from ${d.donor.name} (৳${(d.amount / 100).toLocaleString()})`,
      },
    });

    await prisma.auditLog.create({
      data: {
        campaignId: campaign1.id,
        donationId: donation.id,
        actorId: d.donor.id,
        actor: d.donor.name,
        action: "DONATION_RECORDED",
        details: JSON.stringify({ amountPoisha: d.amount, currency: "BDT", paypalId: d.paypalId }),
      },
    });
  }

  // Ledger for Milestone 1: Reserved and then Released
  await prisma.ledgerEntry.create({
    data: {
      campaignId: campaign1.id,
      milestoneId: c1m1.id,
      type: "RESERVE_MILESTONE",
      amount: 9200000,
      currency: "BDT",
      idempotencyKey: "seed-res-c1-m1",
      description: "Funds earmarked for Milestone 1: Emergency Boat Fuel & Water Jerrycans",
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      campaignId: campaign1.id,
      milestoneId: c1m1.id,
      type: "RELEASE_PAYMENT",
      amount: 9200000,
      currency: "BDT",
      idempotencyKey: "seed-rel-c1-m1",
      description: "Disbursed to Chilmari River Fuel Depot for verified milestone completion",
    },
  });

  await prisma.auditLog.create({
    data: {
      campaignId: campaign1.id,
      milestoneId: c1m1.id,
      actorId: coordinator.id,
      actor: coordinator.name,
      action: "FUNDS_RELEASED",
      details: JSON.stringify({
        amount: 9200000,
        recipient: "Chilmari River Fuel Depot",
        proofMediaId: mediaReceipt.id,
        certificateCode: "SKH-20261028-0042",
      }),
    },
  });

  // Ledger for Milestone 2: RESERVED (150,000 BDT)
  await prisma.ledgerEntry.create({
    data: {
      campaignId: campaign1.id,
      milestoneId: c1m2.id,
      type: "RESERVE_MILESTONE",
      amount: 15000000,
      currency: "BDT",
      idempotencyKey: "seed-res-c1-m2",
      description: "Funds reserved for Milestone 2: Dry Rations & Water Purification Tablets",
    },
  });

  await prisma.auditLog.create({
    data: {
      campaignId: campaign1.id,
      milestoneId: c1m2.id,
      actorId: coordinator.id,
      actor: coordinator.name,
      action: "FUNDS_RESERVED",
      details: JSON.stringify({
        amount: 15000000,
        milestoneTitle: c1m2.title,
      }),
    },
  });

  // 4. Campaign 2: "School kits for Khulna slum children"
  console.log("Creating Campaign 2: School kits for Khulna slum children...");
  const campaign2 = await prisma.campaign.create({
    data: {
      title: "School kits for Khulna slum children",
      slug: "school-kits-khulna",
      location: "Khalishpur, Khulna",
      description:
        "Back-to-school kits containing textbooks, waterproof backpacks, notebooks, geometry boxes, and raincoats for 250 underprivileged children living in the Khalishpur railway colony and jute mill clusters.",
      targetAmount: 20000000, // 200,000 BDT in poisha
      currency: "BDT",
      status: "ACTIVE",
      coordinatorId: coordinator.id,
    },
  });

  // Campaign 2 - Milestones (All pending)
  await prisma.milestone.create({
    data: {
      campaignId: campaign2.id,
      title: "School Bags & Stationery Bundles",
      description: "250 waterproof school backpacks, lined notebooks, pencils, and geometry boxes.",
      order: 1,
      targetAmount: 8000000, // 80,000 BDT in poisha
      status: "PENDING",
      assignedVolunteerId: volunteer2.id,
      proofChecklist: JSON.stringify([
        "Stationery supplier invoice and item count voucher",
        "School enrollment verification lists signed by headmasters",
        "Distribution day photo album with geotag",
      ]),
    },
  });

  await prisma.milestone.create({
    data: {
      campaignId: campaign2.id,
      title: "Raincoats & Sturdy Monsoon Footwear",
      description: "Durable rain ponchos and waterproof school shoes sized for elementary students.",
      order: 2,
      targetAmount: 7000000, // 70,000 BDT in poisha
      status: "PENDING",
      assignedVolunteerId: volunteer1.id,
      proofChecklist: JSON.stringify([
        "Bulk shoe and raincoat purchase receipts",
        "Individual sizing and student issuance logs",
      ]),
    },
  });

  await prisma.milestone.create({
    data: {
      campaignId: campaign2.id,
      title: "Community Study Room Desks & Solar Light",
      description: "Low wooden study benches and dual solar lamps for evening tutoring in the community centre.",
      order: 3,
      targetAmount: 5000000, // 50,000 BDT in poisha
      status: "PENDING",
      assignedVolunteerId: volunteer3.id,
      proofChecklist: JSON.stringify([
        "Carpenter work order and timber purchase receipts",
        "Before and after classroom setup photos",
      ]),
    },
  });

  // Campaign 2 - Donations & Ledger Entries
  // Donors: Tahsin Karim (40,000 BDT) + Arif Ahmed (25,000 BDT) = 65,000 BDT (6,500,000 poisha)
  const donationsC2 = [
    {
      donor: donor4,
      amount: 4000000, // 40,000 BDT
      key: "seed-don-c2-01",
      paypalId: "PAYID-KHULNA-001",
    },
    {
      donor: donor1,
      amount: 2500000, // 25,000 BDT
      key: "seed-don-c2-02",
      paypalId: "PAYID-KHULNA-002",
    },
  ];

  for (const d of donationsC2) {
    const donation = await prisma.donation.create({
      data: {
        campaignId: campaign2.id,
        donorId: d.donor.id,
        donorName: d.donor.name,
        donorEmail: d.donor.email,
        amount: d.amount,
        currency: "BDT",
        amountUsdCents: Math.round(d.amount / 120),
        status: "COMPLETED",
        idempotencyKey: d.key,
        paypalOrderId: d.paypalId,
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        campaignId: campaign2.id,
        donationId: donation.id,
        type: "CREDIT_DONATION",
        amount: d.amount,
        currency: "BDT",
        idempotencyKey: d.key,
        description: `Donation from ${d.donor.name} (৳${(d.amount / 100).toLocaleString()})`,
      },
    });

    await prisma.auditLog.create({
      data: {
        campaignId: campaign2.id,
        donationId: donation.id,
        actorId: d.donor.id,
        actor: d.donor.name,
        action: "DONATION_RECORDED",
        details: JSON.stringify({ amountPoisha: d.amount, currency: "BDT", paypalId: d.paypalId }),
      },
    });
  }

  console.log("Seeding completed successfully!");
  console.log("  - Coordinator: Nusrat Jahan");
  console.log("  - Volunteers: Rahim Uddin, Salma Khatun, Tanvir Hasan");
  console.log("  - Donors: Arif Ahmed, Farhana Yasmin, Kazi Nazmul, Tahsin Karim");
  console.log("  - Campaigns: 2 ('Flood relief, Kurigram' and 'School kits for Khulna slum children')");
  console.log("  - Milestones: 6 total (1 RELEASED with verified receipt, 1 RESERVED, 4 PENDING)");
  console.log("  - Seeded Receipt: /demo/receipt-kurigram-fuel.jpg");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
