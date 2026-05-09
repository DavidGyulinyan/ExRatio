import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/use-theme-color';

interface OnboardingGuideProps {
  onComplete: () => void;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete }) => {
  const { t } = useLanguage();
  const primaryColor = useThemeColor({}, "primary");
  const textInverseColor = useThemeColor({}, "textInverse");
  const [currentStep, setCurrentStep] = useState(0);

  const steps: {
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    {
      title: t('onboarding.welcome'),
      description: t('onboarding.welcomeDesc'),
      icon: "sparkles-outline",
    },
    {
      title: t('onboarding.convert'),
      description: t('onboarding.convertDesc'),
      icon: "swap-horizontal",
    },
    {
      title: t('onboarding.multi'),
      description: t('onboarding.multiDesc'),
      icon: "stats-chart-outline",
    },
    {
      title: t('onboarding.save'),
      description: t('onboarding.saveDesc'),
      icon: "bookmark-outline",
    },
    {
      title: t('onboarding.calculator'),
      description: t('onboarding.calculatorDesc'),
      icon: "calculator-outline",
    },
    {
      title: t('onboarding.offline'),
      description: t('onboarding.offlineDesc'),
      icon: "phone-portrait-outline",
    },
    {
      title: t('onboarding.alerts'),
      description: t('onboarding.alertsDesc'),
      icon: "notifications-outline",
    },
    {
      title: t('onboarding.ready'),
      description: t('onboarding.readyDesc'),
      icon: "checkmark-done-outline",
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      onComplete();
    } catch (error) {
      console.error('Failed to save onboarding status:', error);
      onComplete();
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backNavButton}
          onPress={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
          disabled={currentStep === 0}
          accessibilityRole="button"
          accessibilityLabel="Previous step"
        >
          {currentStep > 0 ? (
            <Ionicons name="arrow-back" size={22} color="#71717a" />
          ) : (
            <View style={styles.backNavPlaceholder} />
          )}
        </TouchableOpacity>
        <Text style={[styles.stepIndicator, styles.stepIndicatorCenter]}>
          {currentStep + 1} / {steps.length}
        </Text>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
           <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
         </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        bounces
      >
        <View style={styles.iconContainer}>
          <Ionicons name={currentStepData.icon} size={48} color={primaryColor} />
        </View>

        <Text style={styles.title}>{currentStepData.title}</Text>
        <Text style={styles.description}>{currentStepData.description}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dotsContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentStep && [styles.activeDot, { backgroundColor: primaryColor }],
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: primaryColor, shadowColor: primaryColor }]}
          onPress={handleNext}
        >
           <Text style={[styles.nextButtonText, { color: textInverseColor }]}>
             {currentStep === steps.length - 1 ? t('onboarding.getStarted') : t('onboarding.next')}
           </Text>
           {currentStep < steps.length - 1 && (
             <Ionicons name="arrow-forward" size={20} color={textInverseColor} />
           )}
         </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 8,
  },
  backNavButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backNavPlaceholder: {
    width: 22,
    height: 22,
  },
  stepIndicator: {
    fontSize: 16,
    color: '#71717a',
    fontWeight: '600',
  },
  stepIndicatorCenter: {
    flex: 1,
    textAlign: 'center',
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#71717a',
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: '#18181b',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
    maxWidth: 400,
    width: '100%',
  },
  description: {
    fontSize: 15,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 400,
    width: '100%',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e4e4e7',
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default OnboardingGuide;