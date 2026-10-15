export type StepModelUrl = string

export type ConvertedStepFile = {
  blobUrl: string
}

export type StepUrlConversionRegistry = {
  inProgress: Map<StepModelUrl, Promise<ConvertedStepFile>>
  completed: Map<StepModelUrl, ConvertedStepFile>
}

export function getOrLoadConvertedStepFile({
  loadConvertedStepFile,
  registry,
  stepUrl,
}: {
  loadConvertedStepFile: (stepUrl: StepModelUrl) => Promise<ConvertedStepFile>
  registry: StepUrlConversionRegistry
  stepUrl: StepModelUrl
}): Promise<ConvertedStepFile> {
  const completedConversion = registry.completed.get(stepUrl)
  if (completedConversion) return Promise.resolve(completedConversion)

  const inProgressConversion = registry.inProgress.get(stepUrl)
  if (inProgressConversion) return inProgressConversion

  const conversionPromise = loadConvertedStepFile(stepUrl)
    .then((convertedStepFile) => {
      registry.completed.set(stepUrl, convertedStepFile)
      return convertedStepFile
    })
    .finally(() => {
      registry.inProgress.delete(stepUrl)
    })
  registry.inProgress.set(stepUrl, conversionPromise)
  return conversionPromise
}
