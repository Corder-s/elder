import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, verifyServerSession } from '@/lib/auth';
import { queryPlatform, withPlatformContext } from '@/lib/db';
import { generateSecureToken, getClientMetadata, hashToken } from '@/lib/security';
import { sendEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    const session = await verifyServerSession(req);
    if (!session || !session.isPlatformAdmin || !session.mfaVerified) {
      return NextResponse.json({ error: 'Unauthorized: MFA-verified Platform Owner required' }, { status: 403 });
    }

    const query = `
      SELECT 
        o.id,
        o.name,
        o.slug,
        o.primary_email,
        o.primary_phone,
        o.address_line1,
        o.city,
        o.state,
        o.registration_number,
        o.allow_access_requests,
        o.status,
        o.trial_ends_at,
        o.created_at,
        sp.name AS plan_name,
        sp.slug AS plan_slug,
        sp.resident_limit,
        ts.status AS subscription_status,
        ts.billing_interval,
        COALESCE((SELECT COUNT(*)::int FROM organization_memberships m WHERE m.organization_id = o.id AND m.status = 'active'), 0) AS user_count,
        COALESCE((SELECT COUNT(*)::int FROM residents r WHERE r.organization_id = o.id), 0) AS resident_count,
        COALESCE((SELECT COUNT(*)::int FROM branches b WHERE b.organization_id = o.id), 0) AS branch_count,
        COALESCE((SELECT SUM(d.file_size_bytes)::bigint FROM documents d WHERE d.organization_id = o.id), 0) AS storage_bytes,
        (
          SELECT u.full_name
          FROM organization_memberships m
          JOIN roles ro ON m.role_id = ro.id
          JOIN users u ON m.user_id = u.id
          WHERE m.organization_id = o.id AND ro.slug IN ('admin', 'ngo_admin') AND m.status = 'active'
          ORDER BY m.joined_at ASC
          LIMIT 1
        ) AS assigned_admin_name,
        (
          SELECT u.email
          FROM organization_memberships m
          JOIN roles ro ON m.role_id = ro.id
          JOIN users u ON m.user_id = u.id
          WHERE m.organization_id = o.id AND ro.slug IN ('admin', 'ngo_admin') AND m.status = 'active'
          ORDER BY m.joined_at ASC
          LIMIT 1
        ) AS assigned_admin_email,
        (
          SELECT MAX(tal.created_at)
          FROM tenant_audit_logs tal
          WHERE tal.organization_id = o.id
        ) AS last_activity_at
      FROM organizations o
      LEFT JOIN tenant_subscriptions ts ON o.id = ts.organization_id
      LEFT JOIN subscription_plans sp ON ts.plan_id = sp.id
      ORDER BY o.created_at DESC;
    `;
    const result = await queryPlatform(session, query);

    return NextResponse.json({ organizations: result.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyServerSession(req);
    if (!session || !session.isPlatformAdmin || !session.mfaVerified) {
      return NextResponse.json(
        { error: 'Forbidden: Only an MFA-verified Platform Owner can create organizations.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      slug,
      primaryEmail,
      primaryPhone,
      addressLine1,
      city,
      state,
      registrationNumber,
      taxExempt80gNumber,
      darpanId,
      planSlug = 'starter',
      branchName = 'Main Facility',
      branchCode = 'HQ-01',
      branchPhone,
      branchAddress,
      adminName,
      adminEmail,
      adminPhone,
      adminContactPhone,
    } = body;

    if (!name || !slug || !primaryEmail || !adminName || !adminEmail) {
      return NextResponse.json(
        { error: 'Organization name, slug, official email, and initial NGO Administrator name and email are required.' },
        { status: 400 }
      );
    }

    const cleanSlug = String(slug).toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    if (cleanSlug.length < 3 || cleanSlug.length > 50) {
      return NextResponse.json(
        { error: 'Organization slug must be 3–50 lowercase alphanumeric/hyphen characters.' },
        { status: 400 }
      );
    }

    const cleanOrgEmail = String(primaryEmail).toLowerCase().trim();
    const cleanAdminEmail = String(adminEmail).toLowerCase().trim();
    const { ipAddress } = getClientMetadata(req);

    const rawInviteToken = generateSecureToken(24);
    const tokenHash = hashToken(rawInviteToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const txResult = await withPlatformContext(session, async (client) => {
      const slugCheck = await client.query('SELECT id FROM organizations WHERE slug = $1', [cleanSlug]);
      if (slugCheck.rows.length > 0) {
        return { status: 409, error: `Organization slug "${cleanSlug}" is already in use.` };
      }

      const planRes = await client.query(
        `SELECT id, slug FROM subscription_plans WHERE slug = $1 LIMIT 1`,
        [planSlug]
      );
      const fallbackPlanRes = planRes.rows.length > 0
        ? planRes
        : await client.query(`SELECT id, slug FROM subscription_plans WHERE slug = 'starter' LIMIT 1`);

      const planId = fallbackPlanRes.rows[0]?.id;
      if (!planId) {
        return { status: 400, error: 'No subscription plan found to provision organization.' };
      }

      // 1. Organization record
      const orgRes = await client.query(
        `
        INSERT INTO organizations (
          name, slug, primary_email, primary_phone, address_line1, city, state,
          registration_number, tax_exempt_80g_number, darpan_id, status, trial_ends_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'trial', CURRENT_TIMESTAMP + INTERVAL '14 days')
        RETURNING *;
        `,
        [
          String(name).trim(),
          cleanSlug,
          cleanOrgEmail,
          primaryPhone || null,
          addressLine1 || null,
          city || null,
          state || null,
          registrationNumber || null,
          taxExempt80gNumber || null,
          darpanId || null,
        ]
      );
      const org = orgRes.rows[0];

      await client.query(`SELECT set_config('app.current_organization_id', $1, true)`, [org.id]);

      // 2. Initial Branch record
      const branchRes = await client.query(
        `
        INSERT INTO branches (organization_id, name, code, phone, address, is_main_branch, status)
        VALUES ($1, $2, $3, $4, $5, true, 'active')
        RETURNING *;
        `,
        [
          org.id,
          String(branchName || 'Main Facility').trim(),
          String(branchCode || 'HQ-01').trim().toUpperCase(),
          branchPhone || primaryPhone || null,
          branchAddress || addressLine1 || null,
        ]
      );
      const branch = branchRes.rows[0];

      // 3. Seed standard NGO roles & permissions
      const roleDefs = [
        { name: 'NGO Administrator', slug: 'admin', desc: 'Full control over home operations, members, and settings' },
        { name: 'Medical Doctor', slug: 'doctor', desc: 'Clinical management, diagnoses, and medical prescriptions' },
        { name: 'Nurse / Caretaker', slug: 'nurse', desc: 'Daily resident care, vitals tracking, and medication administration' },
        { name: 'Accountant', slug: 'accountant', desc: 'Donation management, 80G receipts, and expense vouchers' },
        { name: 'Staff Member', slug: 'staff', desc: 'General facility, admission, and rescue operations' },
        { name: 'Volunteer', slug: 'volunteer', desc: 'Activity support, visits, and event assistance' },
        { name: 'Family Member', slug: 'family_member', desc: 'Restricted access to assigned relative updates' },
        { name: 'Auditor', slug: 'auditor', desc: 'Read-only compliance and financial inspection' },
      ];

      const roleIds: Record<string, string> = {};
      for (const r of roleDefs) {
        const rr = await client.query(
          `INSERT INTO roles (organization_id, name, slug, description, is_system_role) VALUES ($1, $2, $3, $4, true) RETURNING id`,
          [org.id, r.name, r.slug, r.desc]
        );
        roleIds[r.slug] = rr.rows[0].id;
      }

      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, id FROM permissions
         WHERE domain IN ('organization', 'resident', 'rescue', 'care', 'facility', 'visitor', 'document', 'finance')
            OR code IN ('medical:record:read', 'medical:vitals:read', 'medical:prescription:read')`,
        [roleIds.admin]
      );
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, id FROM permissions
         WHERE domain = 'medical'
            OR code IN ('resident:read', 'rescue:read', 'facility:read', 'document:read', 'attendance:read',
                        'event:read', 'task:read', 'task:create', 'task:update', 'diary:update', 'report:read')`,
        [roleIds.doctor]
      );
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, id FROM permissions
         WHERE code IN (
           'resident:read', 'medical:record:read', 'medical:vitals:read', 'medical:vitals:create',
           'medical:prescription:read', 'medical:schedule:administer', 'attendance:read',
           'attendance:mark', 'diary:read', 'diary:create', 'diary:update', 'facility:read', 'visitor:read',
           'event:read', 'task:read', 'task:create', 'task:update', 'report:read'
         )`,
        [roleIds.nurse]
      );
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, id FROM permissions
         WHERE domain = 'finance'
            OR code IN ('resident:read', 'org:subscription:read', 'document:read', 'event:read', 'task:read', 'task:update', 'report:read')`,
        [roleIds.accountant]
      );
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, id FROM permissions
         WHERE code IN (
           'resident:read', 'resident:create', 'resident:update', 'rescue:read', 'rescue:create',
           'rescue:update', 'attendance:read', 'attendance:mark', 'diary:read', 'diary:create', 'diary:update',
           'facility:read', 'visitor:read', 'visitor:log', 'document:read', 'document:upload',
           'event:read', 'event:manage', 'task:read', 'task:create', 'task:update'
         )`,
        [roleIds.staff]
      );
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, id FROM permissions
         WHERE code IN ('resident:read', 'rescue:read', 'rescue:create', 'visitor:log', 'diary:read', 'event:read', 'task:read', 'task:update')`,
        [roleIds.volunteer]
      );
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, id FROM permissions WHERE code = 'family:resident:view_own'`,
        [roleIds.family_member]
      );
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, id FROM permissions
         WHERE code IN ('resident:read', 'org:audit:read', 'finance:donation:read', 'finance:expense:read', 'document:read', 'event:read', 'task:read', 'report:read')`,
        [roleIds.auditor]
      );

      // 4. Subscription & usage records
      await client.query(
        `
        INSERT INTO tenant_subscriptions (
          organization_id, plan_id, status, billing_interval,
          current_period_start, current_period_end, trial_start, trial_end
        )
        VALUES ($1, $2, 'trial', 'monthly', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days')
        `,
        [org.id, planId]
      );
      await client.query(
        `
        INSERT INTO usage_records (organization_id, metric_name, metric_value)
        VALUES
          ($1, 'residents_count', 0),
          ($1, 'staff_count', 0),
          ($1, 'branches_count', 1),
          ($1, 'storage_bytes', 0)
        `,
        [org.id]
      );

      // 5. Initial Administrator account (unverified until invitation acceptance) + pending membership + secure invitation
      let adminUserRes = await client.query('SELECT id, email, full_name, is_platform_admin FROM users WHERE email = $1', [cleanAdminEmail]);
      let adminUserId: string;
      if (adminUserRes.rows.length > 0) {
        if (adminUserRes.rows[0].is_platform_admin) {
          return { status: 400, error: 'A Platform Owner account cannot be assigned as an NGO Administrator.' };
        }
        adminUserId = adminUserRes.rows[0].id;
      } else {
        const unusablePasswordHash = await hashPassword(generateSecureToken(32));
        const newUserRes = await client.query(
          `
          INSERT INTO users (email, password_hash, full_name, phone, is_platform_admin, status, email_verified_at)
          VALUES ($1, $2, $3, $4, false, 'active', NULL)
          RETURNING id;
          `,
          [cleanAdminEmail, unusablePasswordHash, String(adminName).trim(), adminPhone || adminContactPhone || null]
        );
        adminUserId = newUserRes.rows[0].id;
      }

      // Pending membership until initial admin accepts invitation, verifies account, and sets password
      await client.query(
        `
        INSERT INTO organization_memberships (user_id, organization_id, role_id, branch_id, title, status)
        VALUES ($1, $2, $3, $4, 'Initial NGO Administrator', 'pending_approval')
        ON CONFLICT (user_id, organization_id) DO NOTHING;
        `,
        [adminUserId, org.id, roleIds.admin, branch.id]
      );

      const invRes = await client.query(
        `
        INSERT INTO invitations (
          organization_id, email, invitee_name, role_id, branch_id, token_hash,
          invitation_type, message, invited_by, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'initial_admin', $7, $8, $9)
        RETURNING id, email, invitee_name, expires_at, created_at;
        `,
        [
          org.id,
          cleanAdminEmail,
          String(adminName).trim(),
          roleIds.admin,
          branch.id,
          tokenHash,
          `You have been designated as the Initial NGO Administrator for ${org.name}.`,
          session.userId,
          expiresAt,
        ]
      );

      // 6. Platform audit log
      await client.query(
        `
        INSERT INTO platform_audit_logs (actor_user_id, target_organization_id, action, resource_type, resource_id, details, ip_address)
        VALUES ($1, $2, 'organization_created_by_platform_owner', 'organization', $3, $4::jsonb, $5);
        `,
        [
          session.userId,
          org.id,
          String(org.id),
          JSON.stringify({
            slug: org.slug,
            planSlug: fallbackPlanRes.rows[0].slug,
            initialBranchId: branch.id,
            initialAdminEmail: cleanAdminEmail,
            invitationId: invRes.rows[0].id,
          }),
          ipAddress,
        ]
      );

      return { status: 201, organization: org, initialBranch: branch, invitation: invRes.rows[0] };
    });

    if ('error' in txResult) {
      return NextResponse.json({ error: txResult.error }, { status: txResult.status });
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/accept-invitation?token=${encodeURIComponent(rawInviteToken)}`;
    const emailResult = await sendEmail({
      to: cleanAdminEmail,
      subject: `ElderCare OS — Initial Administrator Invitation for ${txResult.organization.name}`,
      text: `Hello ${adminName},\n\nYou have been assigned as the Initial NGO Administrator for ${txResult.organization.name}.\nAccept your invitation, verify your account, and set your password here:\n${inviteUrl}\n\nInvitation Token: ${rawInviteToken}`,
      html: `<p>Hello ${adminName},</p><p>You have been assigned as the Initial NGO Administrator for <strong>${txResult.organization.name}</strong>.</p><p><a href="${inviteUrl}">Accept Invitation &amp; Set Password</a></p>`,
    });

    return NextResponse.json(
      {
        success: true,
        organization: txResult.organization,
        initialBranch: txResult.initialBranch,
        invitation: txResult.invitation,
        invitationStatus: emailResult.mode === 'smtp' ? 'sent' : 'pending_acceptance',
        ...(emailResult.mode === 'dev_sink' && process.env.EMAIL_TEST_CAPTURE !== 'true'
          ? { devInvitationToken: rawInviteToken }
          : {}),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Platform create organization error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create organization' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await verifyServerSession(req);
    if (!session || !session.isPlatformAdmin || !session.mfaVerified) {
      return NextResponse.json({ error: 'Unauthorized: MFA-verified Platform Owner required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      organizationId,
      status,
      name,
      primaryEmail,
      primaryPhone,
      addressLine1,
      city,
      state,
      registrationNumber,
      allowAccessRequests,
    } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }
    if (status && !['active', 'suspended', 'trial'].includes(status)) {
      return NextResponse.json({ error: 'Invalid organization status' }, { status: 400 });
    }

    await withPlatformContext(session, async (client) => {
      await client.query(
        `
        UPDATE organizations
        SET status = COALESCE($1, status),
            name = COALESCE($2, name),
            primary_email = COALESCE($3, primary_email),
            primary_phone = COALESCE($4, primary_phone),
            address_line1 = COALESCE($5, address_line1),
            city = COALESCE($6, city),
            state = COALESCE($7, state),
            registration_number = COALESCE($8, registration_number),
            allow_access_requests = COALESCE($9, allow_access_requests),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $10;
        `,
        [
          status || null,
          name || null,
          primaryEmail ? String(primaryEmail).toLowerCase().trim() : null,
          primaryPhone ?? null,
          addressLine1 ?? null,
          city ?? null,
          state ?? null,
          registrationNumber ?? null,
          typeof allowAccessRequests === 'boolean' ? allowAccessRequests : null,
          organizationId,
        ]
      );

      if (status === 'active' || status === 'suspended') {
        const subStatus = status === 'active' ? 'active' : 'suspended';
        await client.query('UPDATE tenant_subscriptions SET status = $1 WHERE organization_id = $2', [
          subStatus,
          organizationId,
        ]);
      }

      await client.query(
        `
        INSERT INTO platform_audit_logs (actor_user_id, target_organization_id, action, resource_type, resource_id, details)
        VALUES ($1, $2, $3, 'organization', $2::text, $4::jsonb);
        `,
        [
          session.userId,
          organizationId,
          status ? (status === 'active' ? 'organization_activated' : 'organization_suspended') : 'organization_updated',
          JSON.stringify({ status, name, city, state, allowAccessRequests }),
        ]
      );
    });

    return NextResponse.json({ success: true, message: 'Organization updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
