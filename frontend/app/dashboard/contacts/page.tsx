"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../../../lib/store";
import { contactsAPI } from "../../../lib/api";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  priority?: number;
  notify_on_emergency?: boolean;
}

const RELATIONSHIPS = ["Parent", "Sibling", "Friend", "Guardian", "Spouse", "Other"];

export default function ContactsPage() {
  const { emergencyContacts, setEmergencyContacts } = useStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", relationship: "Parent", priority: 1, notify_on_emergency: true });

  const loadContacts = async () => {
    try {
      const res = await contactsAPI.list();
      setContacts(res.data);
      setEmergencyContacts(res.data);
    } catch { setContacts(emergencyContacts); }
  };

  useEffect(() => { loadContacts(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await contactsAPI.update(editing.id, form);
      } else {
        await contactsAPI.create(form);
      }
      await loadContacts();
      setShowForm(false);
      setEditing(null);
      setForm({ name: "", phone: "", email: "", relationship: "Parent", priority: 1, notify_on_emergency: true });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this emergency contact?")) return;
    try {
      await contactsAPI.delete(id);
      await loadContacts();
    } catch { /* ignore */ }
  };

  const handleEdit = (c: Contact) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, email: c.email || "", relationship: c.relationship || "Other", priority: c.priority || 1, notify_on_emergency: c.notify_on_emergency ?? true });
    setShowForm(true);
  };

  const PRIORITY_LABELS: Record<number, string> = { 1: "Primary", 2: "Secondary", 3: "Tertiary" };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Emergency Contacts</h1>
          <p className="text-on-surface-variant text-sm">Trusted people notified during emergencies</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); }} className="btn-primary text-sm py-2 px-4">
          + Add Contact
        </button>
      </div>

      {/* Add/Edit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="glass-card rounded-xl p-6 border border-primary/20">
              <h3 className="font-display font-semibold mb-4">{editing ? "Edit Contact" : "Add Emergency Contact"}</h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md text-on-surface-variant mb-2">Full Name *</label>
                    <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Priya Sharma" />
                  </div>
                  <div>
                    <label className="block text-label-md text-on-surface-variant mb-2">Phone *</label>
                    <input required type="tel" className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="block text-label-md text-on-surface-variant mb-2">Email</label>
                    <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@email.com" />
                  </div>
                  <div>
                    <label className="block text-label-md text-on-surface-variant mb-2">Relationship</label>
                    <select className="input-field" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
                      {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-label-md text-on-surface-variant mb-2">Priority</label>
                    <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}>
                      {[1, 2, 3].map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input type="checkbox" id="notify-em" checked={form.notify_on_emergency} onChange={(e) => setForm({ ...form, notify_on_emergency: e.target.checked })} className="w-4 h-4 accent-primary" />
                    <label htmlFor="notify-em" className="text-sm text-on-surface-variant">Notify on Emergency</label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={loading} className="btn-primary text-sm py-2.5 px-6 disabled:opacity-60">
                    {loading ? "Saving…" : editing ? "Update Contact" : "Add Contact"}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-secondary text-sm py-2.5 px-6">Cancel</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact list */}
      {contacts.length === 0 ? (
        <div className="dashboard-card rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="font-display font-semibold text-lg mb-2">No Emergency Contacts</h3>
          <p className="text-on-surface-variant text-sm mb-4">Add trusted contacts who will be notified during emergencies.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">Add First Contact</button>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.sort((a, b) => (a.priority || 1) - (b.priority || 1)).map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="dashboard-card rounded-xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-display font-bold text-primary text-lg shrink-0">
                {c.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">{c.name}</p>
                  <span className="badge-primary text-xs">{PRIORITY_LABELS[c.priority || 1] || "Contact"}</span>
                  {c.relationship && <span className="badge-muted text-xs">{c.relationship}</span>}
                  {c.notify_on_emergency && <span className="badge-danger text-xs">🔔 Emergency</span>}
                </div>
                <p className="text-sm text-on-surface-variant">{c.phone}</p>
                {c.email && <p className="text-xs text-on-surface-variant/60">{c.email}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <a href={`tel:${c.phone}`} className="px-3 py-2 bg-secondary/20 text-secondary rounded-lg text-xs font-semibold hover:bg-secondary/30 transition-colors">📞 Call</a>
                <button onClick={() => handleEdit(c)} className="px-3 py-2 bg-surface-container text-on-surface-variant rounded-lg text-xs hover:bg-surface-container-high transition-colors">Edit</button>
                <button onClick={() => handleDelete(c.id)} className="px-3 py-2 bg-tertiary-container/10 text-tertiary-container rounded-lg text-xs hover:bg-tertiary-container/20 transition-colors">Remove</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="p-4 bg-surface-container rounded-xl text-xs text-on-surface-variant">
        🔒 Emergency contact information is private and never publicly accessible.
        Contacts are only notified when an emergency is triggered.
      </div>
    </div>
  );
}
