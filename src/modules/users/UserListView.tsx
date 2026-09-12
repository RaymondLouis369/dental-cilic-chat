import React, { useState } from 'react';
import { Users, Mail, Phone, Shield, Plus, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { DEMO_STAFF_CREDENTIALS, DEFAULT_BRANCHES, appendAuditLog } from '../../lib/storage';
import { RoleBadge } from '../navigation/RoleBadge';
import { RoleKey, Profile } from '../../types';

export const UserListView: React.FC = () => {
  const { session, isOrgWideManager } = useAuth();
  const { t } = useLanguage();

  const [staffList, setStaffList] = useState<Profile[]>(() => {
    const raw = localStorage.getItem('dental_saas_profiles');
    if (raw) {
      const parsed: Profile[] = JSON.parse(raw);
      return parsed.filter((p) => p.organization_id === session?.organization.id);
    }
    return Object.values(DEMO_STAFF_CREDENTIALS).map((c) => c.profile);
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('+20 100 ');
  const [newRole, setNewRole] = useState<RoleKey>('doctor');

  if (!session) return null;

  const canManageUsers = session.permissions.includes('user.manage') || isOrgWideManager;

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers || !newDisplayName.trim() || !newEmail.trim()) return;

    const newProfile: Profile = {
      id: 'prof_' + Math.random().toString(36).substring(2, 11),
      auth_user_id: 'auth_' + Math.random().toString(36).substring(2, 11),
      organization_id: session.organization.id,
      role_id: `role_${newRole}`,
      role_key: newRole,
      display_name: newDisplayName,
      email: newEmail,
      phone: newPhone,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [...staffList, newProfile];
    setStaffList(updated);
    localStorage.setItem('dental_saas_profiles', JSON.stringify(updated));

    appendAuditLog({
      organization_id: session.organization.id,
      actor_user_id: session.profile.id,
      actor_email: session.profile.email,
      action: 'user.create',
      entity_type: 'profile',
      entity_id: newProfile.id,
      metadata: { role: newRole, display_name: newProfile.display_name, email: newProfile.email },
    });

    setNewDisplayName('');
    setNewEmail('');
    setShowAddModal(false);
  };

  const getBranchNamesForStaff = (roleKey: RoleKey) => {
    const cred = DEMO_STAFF_CREDENTIALS[roleKey];
    if (!cred || cred.assignedBranchIds.length === 0) {
      return t.users.allBranches;
    }
    return DEFAULT_BRANCHES.filter((b) => cred.assignedBranchIds.includes(b.id))
      .map((b) => b.name)
      .join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{t.users.title}</h1>
            <p className="text-xs text-slate-500">{t.users.subtitle}</p>
          </div>
        </div>

        {canManageUsers && (
          <button
            onClick={() => setShowAddModal(true)}
            id="btn-add-staff-modal"
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.users.addUser}</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-6 py-3.5 text-start font-semibold">{t.users.displayName}</th>
                <th className="px-6 py-3.5 text-start font-semibold">{t.users.role}</th>
                <th className="px-6 py-3.5 text-start font-semibold">{t.users.assignedBranches}</th>
                <th className="px-6 py-3.5 text-start font-semibold">{t.users.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{user.display_name}</div>
                    <div className="flex items-center gap-3 text-slate-400 text-[11px] mt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </span>
                      {user.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3" />
                          {user.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <RoleBadge roleKey={user.role_key} />
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    <span className="inline-block max-w-xs text-xs">
                      {getBranchNamesForStaff(user.role_key)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      {t.users.active}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">{t.users.addUser}</h3>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.users.displayName}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Sherif Nabil"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.users.email}
                </label>
                <input
                  type="email"
                  required
                  placeholder="doctor@dental-demo.eg"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.users.role}
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as RoleKey)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                >
                  <option value="doctor">{t.roles.doctor}</option>
                  <option value="receptionist">{t.roles.receptionist}</option>
                  <option value="branch_manager">{t.roles.branch_manager}</option>
                  <option value="prosthetic_coordinator">{t.roles.prosthetic_coordinator}</option>
                  <option value="lab_user">{t.roles.lab_user}</option>
                  <option value="delivery_user">{t.roles.delivery_user}</option>
                  <option value="center_manager">{t.roles.center_manager}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الهاتف (اختياري)
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-600 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
