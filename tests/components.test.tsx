import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import {
  Button,
  Card,
  Badge,
  VerifiedBadge,
  ProgressBar,
  HandUnderline,
  ReceiptCard,
  EmptyState,
} from "@/components/ui";
import { DonationPanel } from "@/components/campaign/DonationPanel";
import { MilestoneTimeline } from "@/components/campaign/MilestoneTimeline";

describe("UI Components SSR Rendering", () => {
  it("renders Button with primary terracotta variant", () => {
    const html = ReactDOMServer.renderToString(<Button variant="primary">Witness Evidence</Button>);
    expect(html).toContain("bg-terracotta");
    expect(html).toContain("Witness Evidence");
    expect(html).toContain("min-h-[44px]");
  });

  it("renders Card with soft border", () => {
    const html = ReactDOMServer.renderToString(<Card>Evidence Body</Card>);
    expect(html).toContain("bg-paper-card");
    expect(html).toContain("Evidence Body");
  });

  it("renders VerifiedBadge with hand-drawn SVG mark", () => {
    const html = ReactDOMServer.renderToString(<VerifiedBadge label="Witnessed" />);
    expect(html).toContain("Witnessed");
    expect(html).toContain("svg");
    expect(html).toContain("bg-forest-soft");
  });

  it("renders ProgressBar with human amounts", () => {
    const html = ReactDOMServer.renderToString(
      <ProgressBar current={9200} target={12000} currency="BDT" />
    );
    expect(html).toContain("9,200");
    expect(html).toContain("12,000");
    expect(html).toContain("BDT");
  });

  it("renders ReceiptCard with rotated receipt style and dotted tear line", () => {
    const html = ReactDOMServer.renderToString(
      <ReceiptCard amount="5,000" currency="BDT" />
    );
    expect(html).toContain("SAKKHI RECEIPT");
    expect(html).toContain("5,000");
    expect(html).toContain("border-dashed");
  });

  it("renders HandUnderline SVG stroke", () => {
    const html = ReactDOMServer.renderToString(<HandUnderline />);
    expect(html).toContain("svg");
    expect(html).toContain("stroke");
  });

  it("renders EmptyState with kind human messaging", () => {
    const html = ReactDOMServer.renderToString(
      <EmptyState
        title="No verifications yet"
        description="Records will appear here once witnesses submit."
      />
    );
    expect(html).toContain("No verifications yet");
    expect(html).toContain("Records will appear here once witnesses submit.");
  });

  it("renders DonationPanel with presets and mobile sticky bar", () => {
    const html = ReactDOMServer.renderToString(
      <DonationPanel campaignId="c1" campaignTitle="Flood relief, Kurigram" />
    );
    expect(html).toContain("Witnessed Contribution");
    expect(html).toContain("500");
    expect(html).toContain("1,000");
    expect(html).toContain("2,500");
    expect(html).toContain("5,000");
    expect(html).toContain("min-h-[44px]");
  });

  it("renders MilestoneTimeline with verified and paid states", () => {
    const html = ReactDOMServer.renderToString(
      <MilestoneTimeline
        milestones={[
          {
            id: "m1",
            order: 1,
            title: "Emergency Boat Fuel & Water Jerrycans",
            description: "Procuring diesel for relief boats",
            targetAmount: 9200000,
            status: "RELEASED",
            proofChecklist: JSON.stringify(["Cash memo receipt", "GPS photo"]),
            assignedVolunteer: {
              id: "v1",
              name: "Rahim Uddin",
              role: "VOLUNTEER",
            },
            mediaFiles: [
              {
                id: "mf1",
                filename: "receipt-kurigram-fuel.jpg",
                storagePath: "/demo/receipt-kurigram-fuel.jpg",
                caption: "Fuel vendor cash memo #8842",
                isReceipt: true,
                hasGps: true,
                latitude: 25.5562,
                longitude: 89.6714,
                cameraModel: "Samsung Galaxy A54",
                tamperScore: 0.01,
                aiSummary: "Authentic physical receipt with verified GPS.",
                sha256Hash: "7533d2dcfcbe...",
                sizeBytes: 107431,
              },
            ],
            certificates: [
              {
                id: "c1",
                certificateCode: "SKH-20261028-0042",
                signatureHash: "7533d2dcfcbe...",
                issuedAt: new Date("2026-10-28T11:00:00Z"),
              },
            ],
          },
        ]}
      />
    );
    expect(html).toContain("Emergency Boat Fuel &amp; Water Jerrycans");
    expect(html).toContain("Verified &amp; Paid");
    expect(html).toContain("Rahim Uddin");
    expect(html).toContain("92,000");
    expect(html).toContain("SKH-20261028-0042");
    expect(html).toContain("Authentic physical receipt with verified GPS.");
  });
});
