{{/* Labels shared by every resource */}}
{{- define "ecommerce.labels" -}}
app.kubernetes.io/part-of: ecommerce
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{/* Name of the Secret holding passwords and keys */}}
{{- define "ecommerce.secretName" -}}
{{- default "ecommerce-secrets" .Values.secrets.existingSecret -}}
{{- end -}}
