import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import {
  GlassCard,
  GlassInput,
  GlassButton,
  GlassSelect,
  Header,
  SectionHeader,
  StatusBadge,
  LoadingState,
  ErrorState,
} from '@components';
import { SupportTicket } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';
import { formatDate } from '@lib/formatters';

const faqs = [
  { id: '1', q: 'How do I fund my wallet?', a: 'Go to Wallet > Fund Wallet and choose your preferred payment provider.' },
  { id: '2', q: 'Why is my order pending?', a: 'Social media orders may take a few hours to process depending on the provider.' },
  { id: '3', q: 'Can I withdraw to any bank?', a: 'Yes, as long as the account number is valid and matches the account holder name.' },
  { id: '4', q: 'How do I become a seller?', a: 'Navigate to Seller Center and complete the verification steps.' },
  { id: '5', q: 'Is my data secure?', a: 'We use bank-grade encryption and never share your data without consent.' },
];

const categories = ['Transactions', 'Account', 'Technical', 'Billing', 'Other'];

export default function SupportScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await repositories.support.getTickets(user?.id || '');
        setTickets(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [retry, user?.id]);

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit() {
    if (!subject || !category || !description) return;
    setSubmitting(true);
    try {
      const ticket = await repositories.support.createTicket({
        userId: user?.id || '',
        subject,
        category,
        description,
      });
      setTickets([ticket, ...tickets]);
      setSubject('');
      setCategory('');
      setDescription('');
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Support & Help Desk" />

        {error ? (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowForm(!showForm)}
            style={[styles.action, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="ticket-outline" size={24} color={colors.primary} />
            <Text style={[styles.actionLabel, { color: colors.primaryText }]}>Open Ticket</Text>
            <Text style={[styles.actionSub, { color: colors.secondaryText }]}>Create a new support request</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/support/disputes' as any)}
            style={[styles.action, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
            <Text style={[styles.actionLabel, { color: colors.primaryText }]}>Dispute Center</Text>
            <Text style={[styles.actionSub, { color: colors.secondaryText }]}>Raise an issue with a transaction/order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Alert.alert('Coming Soon', 'Live chat support is not available yet.')}
            style={[styles.action, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="chatbubbles-outline" size={24} color={colors.info} />
            <Text style={[styles.actionLabel, { color: colors.primaryText }]}>Chat Support</Text>
            <Text style={[styles.actionSub, { color: colors.secondaryText }]}>Coming Soon</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Alert.alert('Coming Soon', 'AI chat support is not available yet.')}
            style={[styles.action, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="sparkles-outline" size={24} color={colors.warning} />
            <Text style={[styles.actionLabel, { color: colors.primaryText }]}>Chat with AI</Text>
            <Text style={[styles.actionSub, { color: colors.secondaryText }]}>Coming Soon</Text>
          </TouchableOpacity>
        </View>

        <GlassInput
          label="Search FAQs"
          value={search}
          onChangeText={setSearch}
          leftIcon="search-outline"
          placeholder="What do you need help with?"
          containerStyle={styles.search}
        />

        <SectionHeader title="Frequently Asked Questions" />
        {filteredFaqs.length === 0 ? (
          <Text style={[styles.empty, { color: colors.secondaryText }]}>No FAQs match your search.</Text>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expanded === faq.id;
            return (
              <GlassCard key={faq.id} style={styles.faq} blur={false}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setExpanded(isExpanded ? null : faq.id)}
                  style={styles.faqHeader}
                >
                  <Text style={[styles.faqQ, { color: colors.primaryText }]}>{faq.q}</Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedText} />
                </TouchableOpacity>
                {isExpanded && (
                  <Text style={[styles.faqA, { color: colors.secondaryText }]}>{faq.a}</Text>
                )}
              </GlassCard>
            );
          })
        )}

        <SectionHeader
          title="My Recent Tickets"
          action="View All"
          onAction={() => router.push('/support/tickets' as any)}
        />
        {tickets.slice(0, 3).map((ticket) => (
          <GlassCard key={ticket.id} style={styles.ticket} blur={false}>
            <View style={styles.ticketRow}>
              <View style={styles.ticketInfo}>
                <Text style={[styles.ticketSubject, { color: colors.primaryText }]} numberOfLines={1}>
                  {ticket.subject}
                </Text>
                <Text style={[styles.ticketMeta, { color: colors.secondaryText }]}>
                  {ticket.category} • {formatDate(ticket.createdAt)}
                </Text>
              </View>
              <StatusBadge status={ticket.status} />
            </View>
          </GlassCard>
        ))}

        {showForm && (
          <GlassCard style={styles.form}>
            <Text style={[styles.formTitle, { color: colors.primaryText }]}>Create New Ticket</Text>
            <GlassInput label="Subject" value={subject} onChangeText={setSubject} placeholder="Brief issue summary" />
            <GlassSelect
              label="Category"
              options={categories.map((c) => ({ label: c, value: c }))}
              value={category}
              onSelect={setCategory}
              placeholder="Select category"
            />
            <GlassInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the issue in detail"
              multiline
              numberOfLines={4}
              style={styles.description}
            />
            <TouchableOpacity style={[styles.attach, { borderColor: colors.border }]}>
              <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
              <Text style={[styles.attachText, { color: colors.primary }]}>Attach file (optional)</Text>
            </TouchableOpacity>
            <GlassButton title="Submit Request" onPress={handleSubmit} loading={submitting} />
          </GlassCard>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  error: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  action: {
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginTop: spacing.sm,
  },
  actionSub: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  search: { marginBottom: spacing.lg },
  empty: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  faq: { marginBottom: spacing.md, padding: spacing.md },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQ: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginRight: spacing.sm,
  },
  faqA: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  ticket: { marginBottom: spacing.md, padding: spacing.md },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketInfo: { flex: 1, marginRight: spacing.sm },
  ticketSubject: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginBottom: spacing.xs,
  },
  ticketMeta: { fontSize: typography.sizes.sm },
  form: { marginTop: spacing.lg, gap: spacing.md },
  formTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.sm,
  },
  description: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  attach: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
  },
  attachText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
  },
});
