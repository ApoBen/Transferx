# GitHub'a Yükleme ve Yayınlama Talimatları

Projenizi GitHub'a yüklemek ve internet üzerinden erişilebilir hale getirmek (GitHub Pages) için aşağıdaki adımları izleyin.

## 1. Git Deposunu Hazırlama
Terminale şu komutları sırasıyla girin:

```bash
git init
git add .
git commit -m "İlk sürüm: P2P dosya transferi"
```

## 2. GitHub'da Depo Oluşturma
1. [GitHub](https://github.com/new) adresine gidin ve yeni bir **Public** repo oluşturun.
2. Repo adını (örneğin `transferx`) belirleyin.

## 3. Kodları Yükleme
GitHub'ın size verdiği komutları terminale yapıştırın. Genellikle şöyledir:

```bash
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/REPO_ADI.git
git push -u origin main
```

## 4. Web Sitesi Olarak Yayınlama (GitHub Pages)
1. GitHub reponuzda **Settings** (Ayarlar) sekmesine gidin.
2. Soldaki menüden **Pages**'e tıklayın.
3. **Build and deployment** altında **Source** kısmını `Deploy from a branch` seçin.
4. **Branch** kısmını `main` ve klasörü `/src` (eğer root değilse) veya `/` (root ise) seçin. 
   - **ÖNEMLİ:** Bizim `index.html` dosyamız `src` klasöründe.
   - Bu nedenle, ana dizinde bir `index.html` oluşturup `src/index.html`'e yönlendirmek veya GitHub Pages ayarlarından `src` klasörünü seçmek (bazı durumlarda `/docs` gerekir) en iyisidir.
   - **En Kolay Yöntem:** `src` klasörünün içindekileri ana dizine taşıyabilir veya ana dizine şu içeriğe sahip bir `index.html` ekleyebilirsiniz:
     ```html
     <meta http-equiv="refresh" content="0; url=src/index.html">
     ```
   - Veya en temiz yöntem: **Tüm `src` içeriğini ana dizine taşıyın.** (Aşağıdaki komutla yapabilirsiniz).

### Önerilen: Dosyaları Ana Dizine Taşıma (Web İçin)
Eğer sadece web sitesi olarak kullanacaksanız, `src` içindeki her şeyi ana dizine taşıyın:
*(Bu işlem Electron yapısını değiştirebilir, dikkatli olun. Electron için `package.json`'da `main` yolunu güncellemeniz gerekir.)*

Eğer her ikisini de (Desktop + Web) istiyorsanız, kök dizine basit bir yönlendirme `index.html` dosyası ekleyin.
