import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Clock,
  Plus,
  RefreshCw,
  Power,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  UserPlus,
} from 'lucide-react';
import { api, UserProfile, AuditLogItem } from '../services/api';
import { Button, Card, Badge, Input, LoadingSpinner, ConfirmDialog } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../context/LanguageContext';
import { formatIndianDate, formatIndianDateTime } from '../utils/formatters';
import { translateEntityName } from '../utils/translations';

export const ManagerAccessControl: React.FC = () => {
  const { showToast } = useToast();
  const { t, language } = useLanguage();

  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal / Action states
  const [selectedManagerForLock, setSelectedManagerForLock] = useState<UserProfile | null>(null);
  const [lockReason, setLockReason] = useState('Manager absent / emergency security check');
  const [isLocking, setIsLocking] = useState(false);

  // Timing editor state
  const [editingTimingManager, setEditingTimingManager] = useState<UserProfile | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('20:00');
  const [isSavingTiming, setIsSavingTiming] = useState(false);

  // Extension state
  const [extendingManager, setExtendingManager] = useState<UserProfile | null>(null);
  const [extendMinutes, setExtendMinutes] = useState(60);
  const [extendReason, setExtendReason] = useState('Overtime urgent batch dispatch');
  const [isExtending, setIsExtending] = useState(false);
  const [togglingManagerId, setTogglingManagerId] = useState<number | null>(null);

  // New Manager modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const mgrs = await api.listManagers();
      setManagers(mgrs);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error Loading Controls',
        message: err.message || 'Failed to load manager accounts.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lock Immediately
  const handleLock = async () => {
    if (!selectedManagerForLock) return;
    setIsLocking(true);
    try {
      const updated = await api.lockManager(selectedManagerForLock.id, lockReason);
      setManagers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      showToast({
        type: 'warning',
        title: 'Manager Account Locked Immediately',
        message: `${updated.full_name}'s sessions were revoked. Manual lock is now active.`,
      });
      setSelectedManagerForLock(null);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Failed to Lock', message: err.message });
    } finally {
      setIsLocking(false);
    }
  };

  // Unlock
  const handleUnlock = async (manager: UserProfile) => {
    try {
      const updated = await api.unlockManager(manager.id);
      setManagers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      showToast({
        type: 'success',
        title: 'Manager Account Unlocked',
        message: `${updated.full_name} can now log in within permitted hours.`,
      });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Failed to Unlock', message: err.message });
    }
  };

  // Toggle Active
  const handleToggleActive = async (manager: UserProfile) => {
    if (togglingManagerId !== null) return;
    setTogglingManagerId(manager.id);
    try {
      const updated = await api.toggleManagerActive(manager.id);
      setManagers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      showToast({
        type: updated.is_active ? 'success' : 'warning',
        title: updated.is_active ? 'Account Enabled' : 'Account Disabled',
        message: `${updated.full_name} account status updated.`,
      });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Action Failed', message: err.message || 'Failed to toggle manager state.' });
    } finally {
      setTogglingManagerId(null);
    }
  };

  // Approve Pending Manager
  const [approvingManagerId, setApprovingManagerId] = useState<number | null>(null);
  const handleApproveManager = async (manager: UserProfile) => {
    setApprovingManagerId(manager.id);
    try {
      const updated = await api.approveManager(manager.id);
      setManagers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      showToast({
        type: 'success',
        title: language === 'gu' ? 'મેનેજર મંજૂર થયા' : 'Manager Approved',
        message:
          language === 'gu'
            ? `${updated.full_name} હવે વર્કશોપમાં લૉગિન કરી શકશે.`
            : `${updated.full_name} has been approved and can now log in within operating hours.`,
      });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Approval Failed', message: err.message });
    } finally {
      setApprovingManagerId(null);
    }
  };

  // Delete / Decline Manager
  const [deletingManagerId, setDeletingManagerId] = useState<number | null>(null);
  const handleDeleteManager = async (manager: UserProfile) => {
    if (
      !window.confirm(
        language === 'gu'
          ? `શું તમે ખરેખર ${manager.full_name} નું એકાઉન્ટ રદ / કાઢી નાખવા માંગો છો?`
          : `Are you sure you want to decline and remove ${manager.full_name}?`
      )
    )
      return;

    setDeletingManagerId(manager.id);
    try {
      await api.deleteManager(manager.id);
      showToast({
        type: 'info',
        title: language === 'gu' ? 'એકાઉન્ટ રદ કર્યું' : 'Manager Removed',
        message: `${manager.full_name} account was removed.`,
      });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Action Failed', message: err.message });
    } finally {
      setDeletingManagerId(null);
    }
  };

  // Save Timings
  const handleSaveTiming = async () => {
    if (!editingTimingManager) return;
    setIsSavingTiming(true);
    try {
      const updated = await api.updateManagerTiming(editingTimingManager.id, startTime, endTime);
      setManagers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      showToast({
        type: 'success',
        title: 'Access Hours Updated',
        message: `Hours set to ${startTime} - ${endTime} IST.`,
      });
      setEditingTimingManager(null);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Update Failed', message: err.message });
    } finally {
      setIsSavingTiming(false);
    }
  };

  // Extend Hours
  const handleExtendHours = async () => {
    if (!extendingManager) return;
    setIsExtending(true);
    try {
      const updated = await api.extendManagerHours(extendingManager.id, extendMinutes, extendReason);
      setManagers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      showToast({
        type: 'success',
        title: 'Access Hours Temporarily Extended',
        message: `Extended by ${extendMinutes} minutes.`,
      });
      setExtendingManager(null);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Extension Failed', message: err.message });
    } finally {
      setIsExtending(false);
    }
  };

  // Create Manager
  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const created = await api.createManager({
        email: newEmail.trim(),
        phone: newPhone.trim() || undefined,
        full_name: newName.trim(),
        password: newPassword,
        access_start_time: '09:00',
        access_end_time: '20:00',
      });
      setManagers((prev) => [...prev, created]);
      showToast({
        type: 'success',
        title: 'Manager Account Created',
        message: `Account for ${created.full_name} is ready with 09:00 - 20:00 IST hours.`,
      });
      setIsCreateOpen(false);
      setNewEmail('');
      setNewPhone('');
      setNewName('');
      setNewPassword('');
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Creation Failed', message: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading && managers.length === 0) {
    return <LoadingSpinner label="Loading Manager Access Control..." size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-600" />
            {t('manager_access', 'Manager Access')}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={loadData}
          >
            {t('refresh', 'Refresh')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsCreateOpen(true)}
          >
            {t('create_manager', 'Create Manager')}
          </Button>
        </div>
      </div>

      {/* Managers Card List */}
      {managers.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">
            {language === 'gu' ? 'કોઈ મેનેજર ખાતું નથી' : 'No Managers Found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {language === 'gu'
              ? 'હાલમાં ફક્ત એડમિન ઍક્સેસ સક્રિય છે. જરૂર પડ્યે નવું મેનેજર એકાઉન્ટ બનાવી શકાય છે.'
              : 'Currently only Admin access is active. Create a manager account when needed.'}
          </p>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsCreateOpen(true)}
            >
              {t('create_manager', 'Create Manager')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {managers.map((m) => {
          const isLocked = m.is_locked;
          const isActive = m.is_active;

          return (
            <Card
              key={m.id}
              className={`space-y-4 border transition-all ${
                isLocked
                  ? 'border-rose-300 bg-rose-50/20'
                  : !isActive
                  ? 'border-slate-300 bg-slate-50/50'
                  : 'border-slate-200'
              }`}
            >
              {/* Header Profile */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-xs ${
                      isLocked
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {m.full_name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">
                      {translateEntityName(m.full_name, language)}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{m.email}</p>
                    {m.phone && <p className="text-xs text-slate-400 font-mono">{m.phone}</p>}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  {!isActive && m.lock_reason === 'PENDING_APPROVAL' ? (
                    <Badge variant="warning" dot size="sm">
                      {t('pending_approval_badge', 'PENDING APPROVAL')}
                    </Badge>
                  ) : isLocked ? (
                    <Badge variant="danger" dot size="sm">
                      {t('locked_by_admin', 'LOCKED BY ADMIN')}
                    </Badge>
                  ) : !isActive ? (
                    <Badge variant="neutral" size="sm">
                      {t('disabled_status', 'DISABLED')}
                    </Badge>
                  ) : (
                    <Badge variant="success" dot size="sm">
                      {t('operational_status', 'OPERATIONAL')}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Operating Hours & Lock Reason Info */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {t('permitted_hours_label', 'Permitted Hours (IST):')}
                  </span>
                  <span className="font-bold text-slate-800">
                    {m.access_start_time} – {m.access_end_time} IST
                  </span>
                </div>

                {m.temporary_extension_until && (
                  <div className="flex items-center justify-between text-brand-700 bg-brand-50 p-1.5 rounded-lg">
                    <span className="font-semibold">{t('temporary_extension_label', 'Temporary Extension:')}</span>
                    <span className="font-bold font-mono">
                      {language === 'gu' ? 'સુધી' : 'Until'} {formatIndianDateTime(m.temporary_extension_until)}
                    </span>
                  </div>
                )}

                {isLocked && m.lock_reason && (
                  <div className="p-2 rounded-lg bg-rose-100/70 border border-rose-200 text-rose-900 font-medium">
                    <span className="font-bold">{t('lock_reason_label', 'Lock Reason:')}</span> {m.lock_reason}
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-200/50 text-[11px]">
                  <span>{t('last_login_label', 'Last Login:')}</span>
                  <span>{m.last_login_at ? formatIndianDateTime(m.last_login_at) : t('never_logged_in', 'Never logged in')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {!isActive && m.lock_reason === 'PENDING_APPROVAL' ? (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                      disabled={approvingManagerId === m.id}
                      isLoading={approvingManagerId === m.id}
                      onClick={() => handleApproveManager(m)}
                    >
                      ✓ {t('approve_manager_btn', 'Approve Manager')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={deletingManagerId === m.id}
                      isLoading={deletingManagerId === m.id}
                      onClick={() => handleDeleteManager(m)}
                    >
                      ✕ {t('decline_manager_btn', 'Decline')}
                    </Button>
                  </>
                ) : (
                  <>
                    {isLocked ? (
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        icon={<Unlock className="w-3.5 h-3.5" />}
                        onClick={() => handleUnlock(m)}
                      >
                        {t('unlock_account', 'Unlock Account')}
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Lock className="w-3.5 h-3.5" />}
                        onClick={() => setSelectedManagerForLock(m)}
                      >
                        {t('lock_immediately', 'Lock Immediately')}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Clock className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setEditingTimingManager(m);
                        setStartTime(m.access_start_time || '09:00');
                        setEndTime(m.access_end_time || '20:00');
                      }}
                    >
                      {t('edit_hours', 'Edit Hours')}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setExtendingManager(m);
                        setExtendMinutes(60);
                      }}
                    >
                      {t('extend_hours', '+ Extend Hours')}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={togglingManagerId === m.id}
                      className={isActive ? 'text-slate-600' : 'text-emerald-700 font-semibold'}
                      onClick={() => handleToggleActive(m)}
                    >
                      <Power className={`w-3.5 h-3.5 mr-1 ${togglingManagerId === m.id ? 'animate-spin' : ''}`} />
                      {togglingManagerId === m.id ? 'Updating...' : isActive ? t('disable_btn', 'Disable') : t('enable_btn', 'Enable')}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:bg-rose-50 ml-auto"
                      disabled={deletingManagerId === m.id}
                      isLoading={deletingManagerId === m.id}
                      onClick={() => handleDeleteManager(m)}
                      title="Remove manager"
                    >
                      ✕ {t('decline_manager_btn', 'Decline')}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      )}

      {/* Lock Confirmation Dialog */}
      <ConfirmDialog
        isOpen={selectedManagerForLock !== null}
        title="Lock Manager Account Immediately"
        description={`Are you sure you want to immediately lock ${selectedManagerForLock?.full_name}? This action revokes all active sessions instantly and overrides scheduled hours.`}
        confirmText="Lock Immediately"
        variant="danger"
        isLoading={isLocking}
        onConfirm={handleLock}
        onCancel={() => setSelectedManagerForLock(null)}
      />

      {/* Modal: Edit Operating Hours */}
      {editingTimingManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">
              Set Access Hours for {editingTimingManager.full_name}
            </h3>
            <p className="text-xs text-slate-500">
              Timings are calculated in Indian Standard Time (IST - Asia/Kolkata).
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Time (IST)"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <Input
                label="End Time (IST)"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setEditingTimingManager(null)}
                disabled={isSavingTiming}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveTiming}
                isLoading={isSavingTiming}
              >
                Save Schedule
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Extend Hours */}
      {extendingManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">
              Extend Hours for {extendingManager.full_name}
            </h3>
            <p className="text-xs text-slate-500">
              Grant temporary access beyond the standard closing time for today.
            </p>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700">Quick Extension Period</label>
              <div className="grid grid-cols-3 gap-2">
                {[30, 60, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setExtendMinutes(mins)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      extendMinutes === mins
                        ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    +{mins >= 60 ? `${mins / 60} Hour` : `${mins} Mins`}
                  </button>
                ))}
              </div>

              <Input
                label="Extension Reason"
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                placeholder="e.g. Diwali consignment packaging"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setExtendingManager(null)}
                disabled={isExtending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleExtendHours}
                isLoading={isExtending}
              >
                Confirm Extension
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Manager */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-brand-600" />
              Create Workshop Manager Account
            </h3>
            <form onSubmit={handleCreateManager} className="space-y-3">
              <Input
                label="Full Name"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Suresh Vaghela"
              />
              <Input
                label="Email Address"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. suresh@bandhej.com"
              />
              <Input
                label="Mobile Number (Optional)"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="e.g. +91 98250 12345"
              />
              <Input
                label="Password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />

              <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 leading-relaxed border border-amber-200">
                Operating hours default to <strong>09:00 AM – 08:00 PM IST</strong>. Managers cannot create other admins or change their own hours.
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isCreating}
                >
                  Create Manager
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

