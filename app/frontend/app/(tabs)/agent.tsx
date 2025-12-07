import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SwipeNavigator } from '@/components/SwipeNavigator';

export default function AgentScreen() {
  const [messages, setMessages] = useState<{ id: string; text: string; sender: 'user' | 'agent' }[]>([]);
  const [inputText, setInputText] = useState('');
  const insets = useSafeAreaInsets();

  const sendMessage = () => {
    if (!inputText.trim()) return;
    
    const newUserMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user' as const,
    };
    
    setMessages([...messages, newUserMessage]);
    setInputText('');
    
    // Simulated agent response
    setTimeout(() => {
      const agentMessage = {
        id: (Date.now() + 1).toString(),
        text: 'That\'s a great question! Based on the current air quality data, here are my recommendations to help you breathe better and stay healthy.',
        sender: 'agent' as const,
      };
      setMessages(prev => [...prev, agentMessage]);
    }, 800);
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
                </View>
              ))}
            </ScrollView>

            {/* Input Area */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="What can I help you with?"
                  placeholderTextColor="#8B8B8F"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                  onPress={sendMessage}
                  disabled={!inputText.trim()}
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
});
