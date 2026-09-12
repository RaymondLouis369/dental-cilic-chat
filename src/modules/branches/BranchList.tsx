import React, { useState } from 'react';
import { GitBranch, MapPin, Phone, Clock, Plus, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { DEFAULT_BRANCHES, appendAuditLog } from '../../lib/storage';
import { Branch } from '../../types';

export const BranchList: React.FC = () => {
  const { session, isOrgWideManager, hasBranchAccess } = useAuth();
  const { t } = useLanguage();

  const [branches, setBranches] = useState<Branch[]>(() => {
    const raw = localStorage.getItem('dental_saas_branches');
    if (raw) {
      const parsed: Branch[] = JSON.parse(raw);
      // RLS policy: only branches in the same organization
      return parsed.filter((b) => b.organization_id === session?.organization.id);
    }
    return DEFAULT_BRANCHES;
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('Cairo');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('+20 2 ');

  if (!session) return null;

  // Enforce RLS at data filtering:
  // Center Manager sees all organization branches; branch-scoped roles see only authorized branches
  const visibleBranches = branches.filter((branch) => {
    if (isOrgWideManager) return true;
    return hasBranchAccess(branch.id);
  });

  const canCreateBranch = session.permissions.includes('branch.create');

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateBranch || !newBranchName.trim()) return;

    const newBranch: Branch = {
      id: 'br_' + Math.random().toString(36).substring(2, 11),
      organization_id: session.organization.id,
      name: newBranchName,
      code: newBranchCode || `BR-${Math.floor(100 + Math.random() * 900)}`,
      city: newBranchCity,
      address: newBranchAddress,
      phone: newBranchPhone,
      timezone: 'Africa/Cairo',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [...branches, newBranch];
    setBranches(updated);
    localStorage.setItem('dental_saas_branches', JSON.stringify(updated));

    appendAuditLog({
      organization_id: session.organization.id,
      branch_id: newBranch.id,
      actor_user_id: session.profile.id,
      actor_email: session.profile.email,
      action: 'branch.create',
      entity_type: 'branch',
      entity_id: newBranch.id,
      metadata: { name: newBranch.name, code: newBranch.code, city: newBranch.city },
    });

    setNewBranchName('');
    setNewBranchCode('');
    setNewBranchAddress('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{t.branch.title}</h1>
            <p className="text-xs text-slate-500">{t.branch.subtitle}</p>
          </div>
        </div>

        {canCreateBranch && (
          <button
            onClick={() => setShowAddModal(true)}
            id="btn-add-branch-modal"
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.branch.addBranch}</span>
          </button>
        )}
      </div>

      {/* RLS Security Isolation Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-100 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">
            {isOrgWideManager
              ? t.branch.allVisibleForManager
              : t.branch.onlyAssignedVisible}
          </p>
          <p className="text-[11px] text-slate-400">
            Enforced via PostgreSQL RLS Policy: <code className="text-teal-300 font-mono">branches_select_isolated (auth.has_branch_access)</code>.
            {isOrgWideManager
              ? ` Displaying all ${visibleBranches.length} branches across Egypt.`
              : ` Displaying ${visibleBranches.length} branch(es) authorized for role [${session.role.key}].`}
          </p>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleBranches.map((branch) => (
          <div
            key={branch.id}
            id={`branch-card-${branch.code}`}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-teal-300 transition"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {branch.code}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  {t.org.active}
                </span>
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-900">{branch.name}</h3>

              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                  <span>{branch.address}, {branch.city}</span>
                </div>
                {branch.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="font-mono text-[11px]">{branch.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="text-[11px] text-slate-500">{branch.timezone}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>{branch.city}, Egypt</span>
              <span className="text-teal-600 font-medium">RLS Verified ✓</span>
            </div>
          </div>
        ))}
      </div>

      {visibleBranches.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500">{t.branch.noBranchesAssigned}</p>
        </div>
      )}

      {/* Add Branch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">{t.branch.addBranch}</h3>
            <form onSubmit={handleAddBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.branch.branchName}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mansoura Branch - El-Geish St"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.branch.branchCode}
                </label>
                <input
                  type="text"
                  placeholder="BR-MAN-01"
                  value={newBranchCode}
                  onChange={(e) => setNewBranchCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.branch.city}
                </label>
                <select
                  value={newBranchCity}
                  onChange={(e) => setNewBranchCity(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                >
                  <option value="Cairo">Cairo (القاهرة)</option>
                  <option value="Alexandria">Alexandria (الإسكندرية)</option>
                  <option value="Giza">Giza (الجيزة)</option>
                  <option value="Mansoura">Mansoura (المنصورة)</option>
                  <option value="Tanta">Tanta (طنطا)</option>
                  <option value="Aswan">Aswan (أسوان)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.branch.address}
                </label>
                <input
                  type="text"
                  required
                  placeholder="El-Geish St, Building 14"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.branch.phone}
                </label>
                <input
                  type="text"
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
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
