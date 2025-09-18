import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Theme } from '@/constants/Theme';
import { Colors } from '@/constants/Colors';
import {
  Button,
  Card,
  Input,
  Badge,
  Avatar,
  Chip,
} from '@/components/ui';

export default function DesignSystemScreen() {
  const [inputValue, setInputValue] = useState('');
  const [selectedChips, setSelectedChips] = useState<string[]>([]);

  const toggleChip = (chip: string) => {
    setSelectedChips(prev =>
      prev.includes(chip)
        ? prev.filter(c => c !== chip)
        : [...prev, chip]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>TMA Design System</Text>

        <Section title="Brand Colors">
          <View style={styles.colorGrid}>
            <ColorSwatch color={Colors.primary} label="Primary" />
            <ColorSwatch color={Colors.secondary.dark} label="Dark" />
            <ColorSwatch color={Colors.secondary.light} label="Light" />
            <ColorSwatch color={Colors.status.success} label="Success" />
            <ColorSwatch color={Colors.status.warning} label="Warning" />
            <ColorSwatch color={Colors.status.error} label="Error" />
            <ColorSwatch color={Colors.status.info} label="Info" />
          </View>
        </Section>

        <Section title="Typography">
          <Text style={[styles.text, styles.textXs]}>Extra Small (12px)</Text>
          <Text style={[styles.text, styles.textSm]}>Small (14px)</Text>
          <Text style={[styles.text, styles.textMd]}>Medium (16px)</Text>
          <Text style={[styles.text, styles.textLg]}>Large (18px)</Text>
          <Text style={[styles.text, styles.textXl]}>Extra Large (24px)</Text>
          <Text style={[styles.text, styles.text2xl]}>2X Large (32px)</Text>
        </Section>

        <Section title="Buttons">
          <View style={styles.buttonGroup}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="text">Text</Button>
          </View>
          <View style={styles.buttonGroup}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </View>
          <View style={styles.buttonGroup}>
            <Button fullWidth>Full Width Button</Button>
          </View>
          <View style={styles.buttonGroup}>
            <Button disabled>Disabled</Button>
            <Button loading>Loading</Button>
          </View>
        </Section>

        <Section title="Cards">
          <Card variant="elevated" style={styles.card}>
            <Text style={styles.cardTitle}>Elevated Card</Text>
            <Text style={styles.cardText}>
              This is an elevated card with shadow effect.
            </Text>
          </Card>
          <Card variant="filled" style={styles.card}>
            <Text style={styles.cardTitle}>Filled Card</Text>
            <Text style={styles.cardText}>
              This is a filled card with background color.
            </Text>
          </Card>
          <Card variant="outlined" style={styles.card}>
            <Text style={styles.cardTitle}>Outlined Card</Text>
            <Text style={styles.cardText}>
              This is an outlined card with border.
            </Text>
          </Card>
        </Section>

        <Section title="Input Fields">
          <Input
            label="Standard Input"
            placeholder="Enter text here"
            value={inputValue}
            onChangeText={setInputValue}
          />
          <Input
            label="With Helper Text"
            placeholder="Enter email"
            helperText="We'll never share your email"
            keyboardType="email-address"
          />
          <Input
            label="With Error"
            placeholder="Enter password"
            error="Password must be at least 8 characters"
            secureTextEntry
          />
          <Input
            label="With Icons"
            placeholder="Search..."
            leftIcon="search"
            rightIcon="close-circle"
            onRightIconPress={() => {}}
          />
        </Section>

        <Section title="Badges">
          <View style={styles.badgeGroup}>
            <Badge variant="default">Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
          </View>
          <View style={styles.badgeGroup}>
            <Badge size="sm">Small</Badge>
            <Badge size="md">Medium</Badge>
            <Badge size="lg">Large</Badge>
          </View>
        </Section>

        <Section title="Avatars">
          <View style={styles.avatarGroup}>
            <Avatar name="John Doe" size="sm" />
            <Avatar name="Jane Smith" size="md" />
            <Avatar name="Bob Johnson" size="lg" />
            <Avatar name="Alice Brown" size="xl" />
          </View>
          <View style={styles.avatarGroup}>
            <Avatar
              source={{ uri: 'https://via.placeholder.com/150' }}
              size="md"
            />
            <Avatar name="TM" size="md" />
          </View>
        </Section>

        <Section title="Chips">
          <View style={styles.chipGroup}>
            <Chip label="White Belt" />
            <Chip label="Yellow Belt" />
            <Chip label="Orange Belt" />
            <Chip label="Green Belt" />
          </View>
          <View style={styles.chipGroup}>
            {['Beginner', 'Intermediate', 'Advanced'].map(level => (
              <Chip
                key={level}
                label={level}
                selected={selectedChips.includes(level)}
                onPress={() => toggleChip(level)}
              />
            ))}
          </View>
          <View style={styles.chipGroup}>
            <Chip label="Removable" onClose={() => {}} />
            <Chip label="Selected" selected onClose={() => {}} />
          </View>
        </Section>

        <Section title="Spacing">
          <View style={styles.spacingDemo}>
            {Object.entries(Theme.spacing).map(([key, value]) => (
              <View key={key} style={styles.spacingItem}>
                <View
                  style={[
                    styles.spacingBox,
                    { width: value * 2, height: value * 2 },
                  ]}
                />
                <Text style={styles.spacingLabel}>
                  {key}: {value}px
                </Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Border Radius">
          <View style={styles.radiusDemo}>
            {Object.entries(Theme.borderRadius).map(([key, value]) => (
              <View key={key} style={styles.radiusItem}>
                <View
                  style={[
                    styles.radiusBox,
                    { borderRadius: value },
                  ]}
                />
                <Text style={styles.radiusLabel}>
                  {key}: {value}px
                </Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Shadows">
          <View style={styles.shadowDemo}>
            {Object.entries(Theme.shadows).map(([key, value]) => (
              <View
                key={key}
                style={[styles.shadowBox, value as any]}
              >
                <Text style={styles.shadowLabel}>{key}</Text>
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.colorSwatch}>
      <View style={[styles.colorBox, { backgroundColor: color }]} />
      <Text style={styles.colorLabel}>{label}</Text>
      <Text style={styles.colorHex}>{color}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.secondary,
  },
  scrollContent: {
    paddingVertical: Theme.spacing.xl,
  },
  title: {
    fontSize: Theme.typography.sizes['2xl'],
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: Theme.spacing['2xl'],
  },
  section: {
    marginBottom: Theme.spacing['2xl'],
    paddingHorizontal: Theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.lg,
  },
  text: {
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.sm,
  },
  textXs: { fontSize: Theme.typography.sizes.xs },
  textSm: { fontSize: Theme.typography.sizes.sm },
  textMd: { fontSize: Theme.typography.sizes.md },
  textLg: { fontSize: Theme.typography.sizes.lg },
  textXl: { fontSize: Theme.typography.sizes.xl },
  text2xl: { fontSize: Theme.typography.sizes['2xl'] },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  card: {
    marginBottom: Theme.spacing.md,
  },
  cardTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.sm,
  },
  cardText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
  },
  badgeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Theme.spacing.md,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
  },
  colorSwatch: {
    alignItems: 'center',
    width: 80,
  },
  colorBox: {
    width: 60,
    height: 60,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.xs,
  },
  colorLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.primary,
  },
  colorHex: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
  },
  spacingDemo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
  },
  spacingItem: {
    alignItems: 'center',
  },
  spacingBox: {
    backgroundColor: Theme.colors.primary,
    marginBottom: Theme.spacing.xs,
  },
  spacingLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
  },
  radiusDemo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
  },
  radiusItem: {
    alignItems: 'center',
  },
  radiusBox: {
    width: 60,
    height: 60,
    backgroundColor: Theme.colors.primary,
    marginBottom: Theme.spacing.xs,
  },
  radiusLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
  },
  shadowDemo: {
    gap: Theme.spacing.lg,
  },
  shadowBox: {
    backgroundColor: Theme.colors.background.primary,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.md,
  },
  shadowLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.primary,
  },
});