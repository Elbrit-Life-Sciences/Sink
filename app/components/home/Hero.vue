<script setup>
import { AreaChart } from 'lucide-vue-next'

const { title, description } = useAppConfig()
</script>

<template>
  <main class="flex flex-col items-center justify-center min-h-[80vh] py-16 text-center bg-gradient-to-b from-slate-50 to-slate-100">
    <div class="mb-10">
      <img 
        src="/logo-elbrit.png" 
        alt="Elbrit Life Sciences Logo" 
        class="h-20 mx-auto mb-6"
      />
    </div>
    <div class="max-w-3xl mx-auto px-4">
      <h1 class="text-5xl font-bold lg:text-6xl xl:text-7xl tracking-tight mb-6 text-slate-800">
        {{ title }}
      </h1>
      <p class="max-w-2xl mx-auto mt-4 text-xl text-slate-600 mb-12">
        {{ description }}
      </p>
      <div class="flex flex-col sm:flex-row justify-center gap-4 mt-8">
        <HomeLink
          href="/dashboard"
          title="Dashboard"
          class="flex items-center justify-center gap-2 px-10 py-4 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
          size="lg"
        >
          <AreaChart class="w-5 h-5" />
          Go to Dashboard
        </HomeLink>
      </div>
    </div>
    <div class="mt-16 text-sm text-slate-500">
      © {{ new Date().getFullYear() }} Elbrit Life Sciences. All rights reserved.
    </div>
  </main>
</template>
