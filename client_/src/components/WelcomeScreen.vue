<script setup lang="ts">
import { Code2, Users, Zap } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ThemeToggle from './ThemeToggle.vue'

const emit = defineEmits<{
  startSession: []
}>()

const features = [
  {
    icon: Code2,
    title: 'Monaco Editor',
    description: 'Powered by VS Code\'s editor'
  },
  {
    icon: Users,
    title: 'Real-time Collaboration',
    description: 'See changes instantly'
  },
  {
    icon: Zap,
    title: 'Live Cursors',
    description: 'Track collaborators in real-time'
  }
]
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <div class="absolute right-4 top-4">
      <ThemeToggle />
    </div>

    <Card class="w-full max-w-lg">
      <CardHeader class="text-center">
        <CardTitle class="text-3xl font-bold">
          Collaborative Code Editor
        </CardTitle>
        <CardDescription class="text-base">
          Real-time editing powered by Monaco & Socket.IO
        </CardDescription>
      </CardHeader>

      <CardContent class="space-y-6">
        <div class="grid gap-4">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="flex items-start gap-3"
          >
            <component
              :is="feature.icon"
              class="h-5 w-5 mt-0.5 text-primary"
            />
            <div>
              <h3 class="font-medium">{{ feature.title }}</h3>
              <p class="text-sm text-muted-foreground">
                {{ feature.description }}
              </p>
            </div>
          </div>
        </div>

        <Button
          class="w-full"
          size="lg"
          @click="emit('startSession')"
        >
          Start Session
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
