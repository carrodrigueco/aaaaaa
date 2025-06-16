import { redirect_page, submitReport, fileToBase64 } from './cliente_backend.js'

export const componente = {
    formData : {abuseType: null, description: null, location: null, dateApprox: null, evidenceFiles: []},
    filo : [],
    isSubmitting : true,
    filesLoaded : false,
    isSending: false,
    reportCredential : '', 
    reportSubmitted : false,

    async handleSubmit()
    {
        this.isSending = true;
        this.formData.abuseType = Number(this.formData.abuseType);
        try
        {
            const data = JSON.parse(JSON.stringify(this.formData));
            
            const response = await submitReport(data);

            this.reportCredential = response.credencial;
            this.reportSubmitted = true;
        }
        catch (error)
        {
            alert('Error al enviar el reporte.');
            console.error(error);
        }
        finally 
        {
            this.isSending = false; // ocultar cargando
        }
        //const algo = submitReport(data)
        //            .then(response => {
        //                this.reportCredential = response.credencial;
        //                this.isSubmitting = false;
        //                this.reportSubmitted = true;
        //                            })
        //            .catch(error => console.error('Error al enviar reporte:', error.message));
        
    },
    async handleFileChange(event)
    {
        const files_array = event.target.files;

        if (files_array && files_array.length > 0)
        {
            const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

            for (let i = 0; i < files_array.length; i++)
            {
                const file = files_array[i];

                if (!allowedTypes.includes(file.type))
                {
                    continue;
                }

                const base64 = await fileToBase64(file);

                this.formData.evidenceFiles.push({
                    filename: file.name,
                    content: base64,
                    index: i
                });
            }

            this.filesLoaded = this.formData.evidenceFiles.length > 0;
        }
        else
        {
            this.filesLoaded = false;
        }

        // Recalcular si se puede enviar
        this.isSubmitting = !this.camposValidos();
        
    },
    eliminarArchivo(index)
    {
        this.formData.evidenceFiles.splice(index, 1);
        // Si quieres actualizar alguna otra variable asociada
        this.filesLoaded = this.formData.evidenceFiles.length > 0;

    },
    camposValidos()
    {
        return this.formData.abuseType.trim() !== null &&
               this.formData.description.trim() !== null &&
               this.formData.location.trim() !== null &&
               this.formData.dateApprox.trim() !== null;
    },
    handleReturnHome()
    {
        redirect_page('index');
    }

};
