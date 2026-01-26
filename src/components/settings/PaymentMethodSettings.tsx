'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, Smartphone, Building2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentMethod {
  id: number;
  type: 'mtn_momo' | 'orange_money' | 'bank_transfer';
  accountName: string;
  accountNumber: string;
  bankName: string | null;
  bankCode: string | null;
  bankBranch: string | null;
  bankAddress: string | null;
  isEnabled: boolean;
}

const typeLabels = {
  mtn_momo: 'MTN Mobile Money',
  orange_money: 'Orange Money',
  bank_transfer: 'Bank Transfer',
};

const typeIcons = {
  mtn_momo: Smartphone,
  orange_money: Smartphone,
  bank_transfer: Building2,
};

const typeColors = {
  mtn_momo: 'bg-yellow-500',
  orange_money: 'bg-orange-500',
  bank_transfer: 'bg-blue-500',
};

export function PaymentMethodSettings() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: 'mtn_momo' as 'mtn_momo' | 'orange_money' | 'bank_transfer',
    accountName: '',
    accountNumber: '',
    bankName: '',
    bankCode: '',
    bankBranch: '',
    bankAddress: '',
    isEnabled: true,
  });

  const fetchMethods = async () => {
    try {
      const response = await fetch('/api/payment-methods', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setMethods(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const resetForm = () => {
    setFormData({
      type: 'mtn_momo',
      accountName: '',
      accountNumber: '',
      bankName: '',
      bankCode: '',
      bankBranch: '',
      bankAddress: '',
      isEnabled: true,
    });
    setEditingMethod(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      type: method.type,
      accountName: method.accountName,
      accountNumber: method.accountNumber,
      bankName: method.bankName || '',
      bankCode: method.bankCode || '',
      bankBranch: method.bankBranch || '',
      bankAddress: method.bankAddress || '',
      isEnabled: method.isEnabled,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.accountName || !formData.accountNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const url = editingMethod 
        ? `/api/payment-methods/${editingMethod.id}` 
        : '/api/payment-methods';
      
      const response = await fetch(url, {
        method: editingMethod ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save');
      }

      toast.success(editingMethod ? 'Payment method updated' : 'Payment method added');
      setDialogOpen(false);
      resetForm();
      fetchMethods();
    } catch (error) {
      console.error('Error saving payment method:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save payment method');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    try {
      const response = await fetch(`/api/payment-methods/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      toast.success('Payment method deleted');
      fetchMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Failed to delete payment method');
    }
  };

  const handleToggleEnabled = async (method: PaymentMethod) => {
    try {
      const response = await fetch(`/api/payment-methods/${method.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isEnabled: !method.isEnabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      fetchMethods();
    } catch (error) {
      console.error('Error toggling payment method:', error);
      toast.error('Failed to update payment method');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Payment Methods</h3>
          <p className="text-sm text-muted-foreground">
            Configure payment methods that will appear on your invoices and payment request emails.
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Method
        </Button>
      </div>

      {methods.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payment methods configured yet.</p>
            <p className="text-sm">Add your Mobile Money or Bank details to include them in payment emails.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {methods.map((method) => {
            const Icon = typeIcons[method.type];
            return (
              <Card key={method.id} className={!method.isEnabled ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${typeColors[method.type]} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{typeLabels[method.type]}</CardTitle>
                        <CardDescription>{method.accountName}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={method.isEnabled}
                        onCheckedChange={() => handleToggleEnabled(method)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(method)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(method.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{method.type === 'bank_transfer' ? 'Account:' : 'Phone:'}</span>{' '}
                    {method.accountNumber}
                    {method.bankName && (
                      <span className="ml-4">
                        <span className="font-medium">Bank:</span> {method.bankName}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
            <DialogDescription>
              Configure the payment details that will appear in your payment request emails.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editingMethod && (
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtn_momo">MTN Mobile Money</SelectItem>
                    <SelectItem value="orange_money">Orange Money</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label>{formData.type === 'bank_transfer' ? 'Account Number *' : 'Phone Number *'}</Label>
              <Input
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder={formData.type === 'bank_transfer' ? '1234567890' : '679690703'}
              />
            </div>

            {formData.type === 'bank_transfer' && (
              <>
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="First Bank"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SWIFT/BIC Code</Label>
                    <Input
                      value={formData.bankCode}
                      onChange={(e) => setFormData({ ...formData, bankCode: e.target.value })}
                      placeholder="FBCRCMCX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Input
                      value={formData.bankBranch}
                      onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                      placeholder="Main Branch"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bank Address</Label>
                  <Input
                    value={formData.bankAddress}
                    onChange={(e) => setFormData({ ...formData, bankAddress: e.target.value })}
                    placeholder="123 Bank Street, Douala"
                  />
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
              />
              <Label>Enabled</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingMethod ? 'Save Changes' : 'Add Method'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
