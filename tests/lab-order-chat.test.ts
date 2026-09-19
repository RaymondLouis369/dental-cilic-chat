import { describe, it, expect, beforeEach } from 'vitest';
import {
  isUserAuthorizedForLabOrderChat,
  getLabOrderChatMessages,
  addLabOrderChatMessage,
  markLabOrderMessagesAsRead,
  getUnreadLabChatMessageCount,
  getLabOrderChatStatus,
  updateLabOrderChatStatus,
  setStoredLabOrderChatMessages,
  setStoredLabOrderChatThreads,
  getStoredLabOrders,
} from '../src/lib/clinicalStorage';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';
import { LabOrderChatMessage } from '../src/types/clinical';

describe('Phase 07 - Product / Lab Order Chat Integration Tests', () => {
  const defaultOrgId = DEFAULT_EGYPT_ORG.id;
  const otherOrgId = 'org_alexandria_other_999';

  beforeEach(() => {
    // Reset test storage
    setStoredLabOrderChatMessages([]);
    setStoredLabOrderChatThreads([]);
  });

  it('enforces RBAC & participants authorization: Doctor, Lab User, and Prosthetic Coordinator are allowed', () => {
    expect(isUserAuthorizedForLabOrderChat('doctor', defaultOrgId, defaultOrgId)).toBe(true);
    expect(isUserAuthorizedForLabOrderChat('lab_user', defaultOrgId, defaultOrgId)).toBe(true);
    expect(isUserAuthorizedForLabOrderChat('prosthetic_coordinator', defaultOrgId, defaultOrgId)).toBe(true);
    expect(isUserAuthorizedForLabOrderChat('receptionist', defaultOrgId, defaultOrgId)).toBe(true);
    expect(isUserAuthorizedForLabOrderChat('center_manager', defaultOrgId, defaultOrgId)).toBe(true);
  });

  it('explicitly denies access to Patient and Delivery User roles', () => {
    expect(isUserAuthorizedForLabOrderChat('patient', defaultOrgId, defaultOrgId)).toBe(false);
    expect(isUserAuthorizedForLabOrderChat('delivery_user', defaultOrgId, defaultOrgId)).toBe(false);
  });

  it('enforces organization_id isolation: access denied if user organization does not match order organization', () => {
    expect(isUserAuthorizedForLabOrderChat('doctor', otherOrgId, defaultOrgId)).toBe(false);
    expect(isUserAuthorizedForLabOrderChat('lab_user', otherOrgId, defaultOrgId)).toBe(false);

    // Add a message under defaultOrgId
    addLabOrderChatMessage({
      lab_order_id: 'lab_ord_seed_1',
      organization_id: defaultOrgId,
      sender_id: 'doc_1',
      sender_name: 'Dr. Ahmed',
      sender_role: 'doctor',
      message: 'Checking shade A2',
    });

    // Doctor from another org attempting retrieval gets empty array
    const crossOrgMessages = getLabOrderChatMessages('lab_ord_seed_1', 'doctor', otherOrgId);
    expect(crossOrgMessages).toEqual([]);
  });

  it('handles message creation with all metadata fields (sender, role, topic, attachment_ref)', () => {
    const created = addLabOrderChatMessage({
      lab_order_id: 'lab_ord_seed_1',
      organization_id: defaultOrgId,
      sender_id: 'tech_cairo_1',
      sender_name: 'Eng. Mahmoud',
      sender_role: 'lab_user',
      message: 'Zirconia crown milled with 0.5mm chamfer line.',
      topic: 'material',
      attachment_ref: 'Crown_Design_3D.stl',
    });

    expect(created).not.toBeNull();
    expect(created?.lab_order_id).toBe('lab_ord_seed_1');
    expect(created?.sender_name).toBe('Eng. Mahmoud');
    expect(created?.sender_role).toBe('lab_user');
    expect(created?.topic).toBe('material');
    expect(created?.attachment_ref).toBe('Crown_Design_3D.stl');
    expect(created?.read_by).toContain('tech_cairo_1');
    expect(created?.created_at).toBeDefined();
  });

  it('retrieves messages bound strictly to linked lab_order_id', () => {
    // Add messages for two different lab orders
    addLabOrderChatMessage({
      lab_order_id: 'lab_ord_seed_1',
      organization_id: defaultOrgId,
      sender_id: 'doc_1',
      sender_name: 'Dr. Ahmed',
      sender_role: 'doctor',
      message: 'Message for Order 1',
    });

    addLabOrderChatMessage({
      lab_order_id: 'lab_ord_seed_2',
      organization_id: defaultOrgId,
      sender_id: 'tech_1',
      sender_name: 'Eng. Mahmoud',
      sender_role: 'lab_user',
      message: 'Message for Order 2',
    });

    const order1Msgs = getLabOrderChatMessages('lab_ord_seed_1', 'doctor', defaultOrgId);
    expect(order1Msgs.length).toBe(1);
    expect(order1Msgs[0].message).toBe('Message for Order 1');

    const order2Msgs = getLabOrderChatMessages('lab_ord_seed_2', 'lab_user', defaultOrgId);
    expect(order2Msgs.length).toBe(1);
    expect(order2Msgs[0].message).toBe('Message for Order 2');
  });

  it('tracks unread state and updates read_by upon markLabOrderMessagesAsRead', () => {
    addLabOrderChatMessage({
      lab_order_id: 'lab_ord_seed_1',
      organization_id: defaultOrgId,
      sender_id: 'doc_1',
      sender_name: 'Dr. Ahmed',
      sender_role: 'doctor',
      message: 'Please send try-in on Sunday',
    });

    // Lab tech has not read message yet
    const unreadBefore = getUnreadLabChatMessageCount('lab_ord_seed_1', 'tech_cairo_1');
    expect(unreadBefore).toBe(1);

    // Mark as read by lab tech
    const marked = markLabOrderMessagesAsRead('lab_ord_seed_1', 'tech_cairo_1', 'lab_user', defaultOrgId);
    expect(marked).toBe(true);

    const unreadAfter = getUnreadLabChatMessageCount('lab_ord_seed_1', 'tech_cairo_1');
    expect(unreadAfter).toBe(0);
  });

  it('manages optional chat thread status (open vs resolved)', () => {
    expect(getLabOrderChatStatus('lab_ord_seed_1')).toBe('open');

    const updated = updateLabOrderChatStatus('lab_ord_seed_1', 'resolved', 'doctor', defaultOrgId);
    expect(updated).toBe(true);

    expect(getLabOrderChatStatus('lab_ord_seed_1')).toBe('resolved');
  });
});
