import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { SwipeNavigator } from '@/components/SwipeNavigator';

export default function AgentScreen() {
  const [messages, setMessages] = useState<{ id: string; text: string; sender: 'user' | 'agent'; mapsLink?: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const insets = useSafeAreaInsets();

  const backendBase = process.env.EXPO_PUBLIC_API_BASE_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

  // Get user location on mount
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.log('Location permission denied or error:', error);
      }
    };
    getLocation();
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const newUserMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user' as const,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    const question = inputText;
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch(`${backendBase}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: question,
          userLocation, // Send user location for routing
          travelMode: 'walking', // Use walking mode for routing
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }

      const data = await res.json();

      // Format the agent response
      let responseText = data.response || 'No response generated.';

      // Optionally append technical details in smaller text
      if (data.rowCount !== undefined) {
        responseText += `\n\n📊 Data: ${data.rowCount} records`;
      }

      const agentMessage = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'agent' as const,
        mapsLink: data.mapsLink, // Include maps link if available
      };
      setMessages((prev) => [...prev, agentMessage]);
    } catch (error: any) {
      const agentMessage = {
        id: (Date.now() + 1).toString(),
        text: `❌ Error: ${error.message || 'Something went wrong'}`,
        sender: 'agent' as const,
      };
      setMessages((prev) => [...prev, agentMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SwipeNavigator currentRoute="agent">
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.outer, { paddingTop: insets.top + 6 }]}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          >
            <View style={styles.container}>
              {/* Messages Area */}
              <ScrollView
                contentContainerStyle={styles.messagesContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {messages.length === 0 ? (
                  <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeTitle}>What can I help you with?</Text>
                  </View>
                ) : null}

                {messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageBubble,
                      msg.sender === 'user' ? styles.userBubble : styles.agentBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        msg.sender === 'user' ? styles.userText : styles.agentText,
                      ]}
                    >
                      {msg.text}
                    </Text>
                    {msg.mapsLink && msg.sender === 'agent' && (
                      <TouchableOpacity
                        style={styles.mapsButton}
                        onPress={() => Linking.openURL(msg.mapsLink!)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="navigate" size={16} color="#fff" />
                        <Text style={styles.mapsButtonText}>Open in Google Maps</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>

              {/* Input Area */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ask about air quality, traffic, or events..."
                    placeholderTextColor="#8B8B8F"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={!inputText.trim() || loading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sendIcon}>→</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    </SwipeNavigator>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0B0E',
  },
  outer: {
    flex: 1,
    backgroundColor: '#0B0B0E',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  welcomeSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  welcomeIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1EAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 20,
  },
  messageBubble: {
    maxWidth: '90%',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#E8EAED',
    borderBottomRightRadius: 4,
  },
  agentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#1F2937',
    fontWeight: '600',
  },
  agentText: {
    color: '#202124',
    fontWeight: '400',
  },
  inputWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    color: '#202124',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  mapsButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4285F4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  mapsButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
