import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { Theme } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { HelperAttendance } from '@/types/endOfDay';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

interface HelperItem extends HelperAttendance {
  id: string;
}

export const HelperCheckupsStep: React.FC = () => {
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];
  const {
    wizardState,
    updateWizardData,
    goToNextStep,
    goToPreviousStep,
  } = useEndOfDayStore();

  // Parse helper names from previous step
  const existingHelpers = wizardState.data.helper_names?.split(',').map(name => name.trim()).filter(Boolean) || [];

  const [helpers, setHelpers] = useState<HelperItem[]>(() => {
    // Initialize with existing helper attendance data or create new entries
    if (wizardState.data.helper_attendance?.length) {
      return wizardState.data.helper_attendance.map((h, index) => ({
        ...h,
        id: `helper-${index}`,
      }));
    } else {
      return existingHelpers.map((name, index) => ({
        id: `helper-${index}`,
        name,
        status: 'on_time' as const,
        message: undefined,
      }));
    }
  });

  const [newHelperName, setNewHelperName] = useState('');
  const [showAddHelper, setShowAddHelper] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const animationValue = useSharedValue(0);

  useEffect(() => {
    animationValue.value = withSpring(1, {
      damping: 20,
      stiffness: 100,
    });
  }, []);

  const handleAddHelper = () => {
    if (newHelperName.trim()) {
      const newHelper: HelperItem = {
        id: `helper-${Date.now()}`,
        name: newHelperName.trim(),
        status: 'on_time',
        message: undefined,
      };
      setHelpers([...helpers, newHelper]);
      setNewHelperName('');
      setShowAddHelper(false);
    }
  };

  const handleRemoveHelper = (id: string) => {
    Alert.alert(
      'Remove Helper',
      'Are you sure you want to remove this helper?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setHelpers(helpers.filter(h => h.id !== id));
          },
        },
      ]
    );
  };

  const handleStatusChange = (id: string, status: HelperAttendance['status']) => {
    setHelpers(helpers.map(h =>
      h.id === id
        ? { ...h, status, message: status === 'no_show' && !h.message ? 'Did not attend' : h.message }
        : h
    ));
  };

  const handleMessageChange = (id: string, message: string) => {
    setHelpers(helpers.map(h =>
      h.id === id ? { ...h, message: message || undefined } : h
    ));
  };

  const handleNext = () => {
    const helperAttendance = helpers.map(({ id, ...h }) => h);
    updateWizardData({
      helper_attendance: helperAttendance.length > 0 ? helperAttendance : null,
      // Also update helper_names to include all helpers
      helper_names: helpers.map(h => h.name).join(', ') || null,
    });
    goToNextStep();
  };

  const handleSkip = () => {
    updateWizardData({
      helper_attendance: null,
    });
    goToNextStep();
  };

  const getStatusColor = (status: HelperAttendance['status']) => {
    switch (status) {
      case 'on_time':
        return '#4CAF50';
      case 'late':
        return '#FFC107';
      case 'no_show':
        return '#F44336';
      default:
        return currentTheme.text;
    }
  };

  const getStatusIcon = (status: HelperAttendance['status']) => {
    switch (status) {
      case 'on_time':
        return 'checkmark-circle';
      case 'late':
        return 'time';
      case 'no_show':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusText = (status: HelperAttendance['status']) => {
    switch (status) {
      case 'on_time':
        return 'On Time';
      case 'late':
        return 'Late';
      case 'no_show':
        return 'No Show';
      default:
        return 'Unknown';
    }
  };

  const renderHelper = (helper: HelperItem, index: number) => {
    const scale = useSharedValue(1);
    const isEditingMessage = editingMessageId === helper.id;

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: interpolate(animationValue.value, [0, 1], [0, 1]),
      transform: [
        {
          translateY: interpolate(
            animationValue.value,
            [0, 1],
            [20, 0]
          ),
        },
        { scale: scale.value },
      ],
    }));

    const handlePress = () => {
      scale.value = withSpring(0.98);
      setTimeout(() => {
        scale.value = withSpring(1);
      }, 100);
    };

    return (
      <Animated.View key={helper.id} style={[animatedStyle, { marginBottom: Theme.spacing.md }]}>
        <Card variant="outlined" style={styles.helperCard}>
          <View style={styles.helperHeader}>
            <View style={styles.helperInfo}>
              <Ionicons
                name="person"
                size={20}
                color={currentTheme.text}
              />
              <Text style={[styles.helperName, { color: currentTheme.text }]}>
                {helper.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleRemoveHelper(helper.id)}
              style={styles.removeButton}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={'#F44336'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.statusButtons}>
            {(['on_time', 'late', 'no_show'] as const).map((status) => {
              const isSelected = helper.status === status;
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => {
                    handlePress();
                    handleStatusChange(helper.id, status);
                  }}
                  style={[
                    styles.statusButton,
                    isSelected && {
                      backgroundColor: getStatusColor(status) + '15',
                      borderColor: getStatusColor(status),
                    },
                  ]}
                >
                  <Ionicons
                    name={getStatusIcon(status) as any}
                    size={20}
                    color={isSelected ? getStatusColor(status) : currentTheme.text}
                  />
                  <Text
                    style={[
                      styles.statusButtonText,
                      {
                        color: isSelected ? getStatusColor(status) : currentTheme.text,
                        fontFamily: isSelected ? Theme.typography.fonts.semibold : Theme.typography.fonts.regular,
                      },
                    ]}
                  >
                    {getStatusText(status)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {(helper.status === 'late' || helper.status === 'no_show') && (
            <View style={styles.messageSection}>
              <TouchableOpacity
                onPress={() => setEditingMessageId(isEditingMessage ? null : helper.id)}
                style={styles.messageToggle}
              >
                <Ionicons
                  name={isEditingMessage ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={currentTheme.tint}
                />
                <Text style={[styles.messageToggleText, { color: currentTheme.tint }]}>
                  {helper.message ? 'Edit note' : 'Add note'} (optional)
                </Text>
              </TouchableOpacity>

              {isEditingMessage && (
                <TextInput
                  style={[styles.messageInput, { color: currentTheme.text }]}
                  value={helper.message || ''}
                  onChangeText={(text) => handleMessageChange(helper.id, text)}
                  placeholder={
                    helper.status === 'late'
                      ? 'e.g., Traffic delay, arrived 15 minutes late...'
                      : 'e.g., Family emergency, will reschedule...'
                  }
                  placeholderTextColor={currentTheme.text + '80'}
                  multiline
                  numberOfLines={2}
                  maxLength={200}
                  onBlur={() => setEditingMessageId(null)}
                />
              )}
            </View>
          )}
        </Card>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.description, { color: currentTheme.text }]}>
          Track helper attendance to ensure accountability and future planning
        </Text>

        {helpers.length === 0 && !showAddHelper && (
          <Card variant="filled" style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color={currentTheme.text + '60'} />
            <Text style={[styles.emptyTitle, { color: currentTheme.text }]}>
              No Helpers Listed
            </Text>
            <Text style={[styles.emptyText, { color: currentTheme.text }]}>
              Add helpers to track their attendance
            </Text>
            <Button
              variant="primary"
              size="small"
              onPress={() => setShowAddHelper(true)}
              style={styles.emptyButton}
            >
              <Ionicons name="add" size={18} color="white" />
              <Text style={styles.buttonText}>Add Helper</Text>
            </Button>
          </Card>
        )}

        {helpers.map((helper, index) => renderHelper(helper, index))}

        {showAddHelper ? (
          <Card variant="filled" style={styles.addHelperCard}>
            <View style={styles.addHelperContent}>
              <TextInput
                style={[styles.addHelperInput, { color: currentTheme.text }]}
                value={newHelperName}
                onChangeText={setNewHelperName}
                placeholder="Enter helper's name..."
                placeholderTextColor={currentTheme.text + '80'}
                autoFocus
                onSubmitEditing={handleAddHelper}
              />
              <View style={styles.addHelperButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setNewHelperName('');
                    setShowAddHelper(false);
                  }}
                  style={styles.addHelperButton}
                >
                  <Ionicons name="close" size={20} color={'#F44336'} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddHelper}
                  style={[styles.addHelperButton, { marginLeft: Theme.spacing.sm }]}
                >
                  <Ionicons name="checkmark" size={20} color={'#4CAF50'} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ) : helpers.length > 0 && (
          <TouchableOpacity
            onPress={() => setShowAddHelper(true)}
            style={styles.addMoreButton}
          >
            <Ionicons name="add-circle-outline" size={20} color={currentTheme.tint} />
            <Text style={[styles.addMoreText, { color: currentTheme.tint }]}>
              Add Another Helper
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.info}>
          <Ionicons name="information-circle" size={20} color={'#2196F3'} />
          <Text style={[styles.infoText, { color: '#2196F3' }]}>
            This helps track helper reliability and plan future sessions
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            variant="outline"
            onPress={goToPreviousStep}
            style={styles.footerButton}
          >
            Back
          </Button>
          {helpers.length === 0 ? (
            <Button
              variant="text"
              onPress={handleSkip}
              style={styles.footerButton}
            >
              Skip
            </Button>
          ) : (
            <Button
              variant="primary"
              onPress={handleNext}
              style={styles.footerButton}
            >
              Continue
            </Button>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Theme.spacing.xl,
  },
  description: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: Theme.spacing.lg,
    lineHeight: Theme.typography.sizes.md * 1.5,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl * 2,
    marginBottom: Theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  emptyText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
  buttonText: {
    color: 'white',
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    marginLeft: Theme.spacing.xs,
  },
  helperCard: {
    overflow: 'hidden',
  },
  helperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  helperInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  helperName: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    marginLeft: Theme.spacing.sm,
  },
  removeButton: {
    padding: Theme.spacing.xs,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.spacing.sm,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: 'transparent',
  },
  statusButtonText: {
    fontSize: Theme.typography.sizes.sm,
    marginLeft: Theme.spacing.xs,
  },
  messageSection: {
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  messageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageToggleText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginLeft: Theme.spacing.xs,
  },
  messageInput: {
    marginTop: Theme.spacing.sm,
    padding: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: Theme.borderRadius.sm,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addHelperCard: {
    marginBottom: Theme.spacing.md,
  },
  addHelperContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addHelperInput: {
    flex: 1,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.xs,
  },
  addHelperButtons: {
    flexDirection: 'row',
    marginLeft: Theme.spacing.md,
  },
  addHelperButton: {
    padding: Theme.spacing.sm,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  addMoreText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    marginLeft: Theme.spacing.sm,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3' + '10',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.lg,
  },
  infoText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Theme.spacing.lg,
  },
  footerButton: {
    flex: 1,
    marginHorizontal: Theme.spacing.sm,
  },
});