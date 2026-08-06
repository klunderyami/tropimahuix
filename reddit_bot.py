#!/usr/bin/env python3
"""
Bot de Reddit Automatizado con PRAW
- Almacenamiento local de IDs respondidos
- Respuestas aleatorias para evitar spam
- Manejo de rate limits con backoff exponencial
"""

import os
import json
import time
import random
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime

import praw
from dotenv import load_dotenv
from praw.exceptions import RedditAPIException, RateLimitExceeded

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('reddit_bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class RedditBot:
    """Bot automatizado de Reddit con manejo de rate limits y almacenamiento local"""
    
    def __init__(self, env_path: str = '.env', storage_path: str = 'responded_posts.json'):
        """
        Inicializa el bot de Reddit
        
        Args:
            env_path: Ruta al archivo .env
            storage_path: Ruta al archivo JSON de almacenamiento
        """
        # Cargar variables de entorno
        load_dotenv(env_path)
        
        self.client_id = os.getenv('CLIENT_ID')
        self.client_secret = os.getenv('CLIENT_SECRET')
        self.reddit_user = os.getenv('REDDIT_USER')
        self.reddit_pass = os.getenv('REDDIT_PASS')
        self.user_agent = os.getenv('USER_AGENT', 'RedditBot/1.0 by Tropicana')
        
        # Validar variables requeridas
        if not all([self.client_id, self.client_secret, self.reddit_user, self.reddit_pass]):
            raise ValueError("Faltan variables de entorno requeridas. Verifica tu archivo .env")
        
        # Inicializar almacenamiento
        self.storage_path = Path(storage_path)
        self.responded_ids = self._load_storage()
        
        # Inicializar cliente de Reddit
        self.reddit = self._init_reddit_client()
        
        # Plantillas de respuesta
        self.response_templates = [
            "¡Excelente publicación! {comment}",
            "Muy interesante. {comment}",
            "Gracias por compartir esto. {comment}",
            "¡Gran aporte! {comment}",
            "Me parece genial. {comment}",
            "¡Increíble! {comment}",
            "Esto es muy útil, gracias. {comment}",
            "¡Qué buena información! {comment}",
            "Totalmente de acuerdo. {comment}",
            "¡Excelente trabajo! {comment}"
        ]
        
        # Contador de intentos de retry
        self.retry_count = 0
        self.max_retries = 5
        
    def _init_reddit_client(self) -> praw.Reddit:
        """
        Inicializa y autentica el cliente de Reddit
        
        Returns:
            Instancia autenticada de PRAW Reddit
            
        Raises:
            Exception: Si la autenticación falla
        """
        try:
            reddit = praw.Reddit(
                client_id=self.client_id,
                client_secret=self.client_secret,
                username=self.reddit_user,
                password=self.reddit_pass,
                user_agent=self.user_agent
            )
            
            # Verificar autenticación
            user = reddit.user.me()
            logger.info(f"✅ Autenticado exitosamente como: {user.name}")
            return reddit
            
        except Exception as e:
            logger.error(f"❌ Error de autenticación: {e}")
            raise
    
    def _load_storage(self) -> set:
        """
        Carga los IDs de posts ya respondidos desde el archivo JSON
        
        Returns:
            Set de IDs de posts respondidos
        """
        if not self.storage_path.exists():
            logger.info(f"📁 Creando nuevo archivo de almacenamiento: {self.storage_path}")
            self._save_storage(set())
            return set()
        
        try:
            with open(self.storage_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                responded_ids = set(data.get('responded_ids', []))
                logger.info(f"📊 Cargados {len(responded_ids)} IDs de posts respondidos")
                return responded_ids
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"⚠️ Error al cargar almacenamiento: {e}. Iniciando con set vacío.")
            return set()
    
    def _save_storage(self, responded_ids: set) -> None:
        """
        Guarda los IDs de posts respondidos en el archivo JSON
        
        Args:
            responded_ids: Set de IDs de posts respondidos
        """
        try:
            data = {
                'responded_ids': list(responded_ids),
                'last_updated': datetime.now().isoformat(),
                'total_responded': len(responded_ids)
            }
            with open(self.storage_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.debug(f"💾 Almacenamiento guardado: {len(responded_ids)} IDs")
        except IOError as e:
            logger.error(f"❌ Error al guardar almacenamiento: {e}")
    
    def add_response_template(self, template: str) -> None:
        """
        Agrega una nueva plantilla de respuesta
        
        Args:
            template: Plantilla de respuesta con placeholder {comment}
        """
        if '{comment}' not in template:
            raise ValueError("La plantilla debe contener el placeholder {comment}")
        self.response_templates.append(template)
        logger.info(f"➕ Plantilla agregada. Total: {len(self.response_templates)}")
    
    def get_random_response(self, comment_text: str = "") -> str:
        """
        Genera una respuesta aleatoria basada en las plantillas
        
        Args:
            comment_text: Texto del comentario original (opcional)
            
        Returns:
            Respuesta formateada aleatoria
        """
        template = random.choice(self.response_templates)
        
        # Personalizar con el comentario original si está disponible
        if comment_text:
            # Limitar longitud del comentario original
            snippet = comment_text[:100] + "..." if len(comment_text) > 100 else comment_text
            response = template.format(comment=f'"{snippet}"')
        else:
            response = template.format(comment="")
        
        return response
    
    def is_responded(self, post_id: str) -> bool:
        """
        Verifica si un post ya fue respondido
        
        Args:
            post_id: ID del post de Reddit
            
        Returns:
            True si ya fue respondido, False en caso contrario
        """
        return post_id in self.responded_ids
    
    def mark_responded(self, post_id: str) -> None:
        """
        Marca un post como respondido y guarda en almacenamiento
        
        Args:
            post_id: ID del post de Reddit
        """
        self.responded_ids.add(post_id)
        self._save_storage(self.responded_ids)
        logger.debug(f"✅ Post {post_id} marcado como respondido")
    
    def handle_rate_limit(self, error: RateLimitExceeded) -> None:
        """
        Maneja excepciones de RateLimitExceeded con pausa exponencial
        
        Args:
            error: Excepción de RateLimitExceeded
            
        Raises:
            Exception: Si se excede el máximo de reintentos
        """
        if self.retry_count >= self.max_retries:
            raise Exception(f"Máximo de reintentos alcanzado ({self.max_retries})")
        
        # Calcular tiempo de espera exponencial
        wait_time = min(60 * (2 ** self.retry_count), 600)  # Max 10 minutos
        logger.warning(f"⏳ Rate limit excedido. Esperando {wait_time} segundos... (Intento {self.retry_count + 1}/{self.max_retries})")
        
        time.sleep(wait_time)
        self.retry_count += 1
    
    def reply_to_post(self, submission_id: str, custom_message: Optional[str] = None) -> bool:
        """
        Responde a un post de Reddit
        
        Args:
            submission_id: ID del post (sin prefijo 't3_')
            custom_message: Mensaje personalizado (opcional)
            
        Returns:
            True si se respondió exitosamente, False en caso contrario
        """
        # Verificar si ya fue respondido
        if self.is_responded(submission_id):
            logger.info(f"⏭️ Post {submission_id} ya fue respondido. Saltando...")
            return False
        
        try:
            # Obtener el submission
            submission = self.reddit.submission(id=submission_id)
            
            # Generar respuesta
            if custom_message:
                reply_text = custom_message
            else:
                reply_text = self.get_random_response(submission.title)
            
            # Responder
            comment = submission.reply(reply_text)
            logger.info(f"💬 Respondido al post {submission_id}: {submission.title[:50]}...")
            logger.info(f"   Comentario ID: {comment.id}")
            
            # Marcar como respondido
            self.mark_responded(submission_id)
            self.retry_count = 0  # Resetear contador en éxito
            
            return True
            
        except RateLimitExceeded as e:
            logger.warning(f"⚠️ Rate limit alcanzado: {e}")
            self.handle_rate_limit(e)
            return self.reply_to_post(submission_id, custom_message)  # Retry
            
        except RedditAPIException as e:
            logger.error(f"❌ Error de API de Reddit: {e}")
            return False
            
        except Exception as e:
            logger.error(f"❌ Error inesperado al responder post {submission_id}: {e}")
            return False
    
    def reply_to_comment(self, comment_id: str, custom_message: Optional[str] = None) -> bool:
        """
        Responde a un comentario de Reddit
        
        Args:
            comment_id: ID del comentario (sin prefijo 't1_')
            custom_message: Mensaje personalizado (opcional)
            
        Returns:
            True si se respondió exitosamente, False en caso contrario
        """
        # Verificar si ya fue respondido
        if self.is_responded(comment_id):
            logger.info(f"⏭️ Comentario {comment_id} ya fue respondido. Saltando...")
            return False
        
        try:
            # Obtener el comentario
            comment = self.reddit.comment(id=comment_id)
            
            # Generar respuesta
            if custom_message:
                reply_text = custom_message
            else:
                reply_text = self.get_random_response(comment.body)
            
            # Responder
            reply = comment.reply(reply_text)
            logger.info(f"💬 Respondido al comentario {comment_id}")
            logger.info(f"   Respuesta ID: {reply.id}")
            
            # Marcar como respondido
            self.mark_responded(comment_id)
            self.retry_count = 0  # Resetear contador en éxito
            
            return True
            
        except RateLimitExceeded as e:
            logger.warning(f"⚠️ Rate limit alcanzado: {e}")
            self.handle_rate_limit(e)
            return self.reply_to_comment(comment_id, custom_message)  # Retry
            
        except RedditAPIException as e:
            logger.error(f"❌ Error de API de Reddit: {e}")
            return False
            
        except Exception as e:
            logger.error(f"❌ Error inesperado al responder comentario {comment_id}: {e}")
            return False
    
    def monitor_subreddit(self, subreddit_name: str, keywords: list[str], limit: int = 25) -> None:
        """
        Monitorea un subreddit y responde a posts que coincidan con keywords
        
        Args:
            subreddit_name: Nombre del subreddit (sin r/)
            keywords: Lista de palabras clave a buscar
            limit: Número de posts a revisar
        """
        logger.info(f"🔍 Monitoreando r/{subreddit_name} en busca de: {', '.join(keywords)}")
        
        try:
            subreddit = self.reddit.subreddit(subreddit_name)
            
            for submission in subreddit.new(limit=limit):
                # Verificar si ya fue respondido
                if self.is_responded(submission.id):
                    continue
                
                # Buscar keywords en título y contenido
                title_lower = submission.title.lower()
                body_lower = (submission.selftext or "").lower()
                combined_text = f"{title_lower} {body_lower}"
                
                # Verificar si coincide con alguna keyword
                if any(keyword.lower() in combined_text for keyword in keywords):
                    logger.info(f"🎯 Post encontrado: {submission.title[:50]}...")
                    
                    # Responder
                    success = self.reply_to_post(submission.id)
                    
                    if success:
                        # Pausa aleatoria entre respuestas (30-120 segundos)
                        sleep_time = random.randint(30, 120)
                        logger.info(f"😴 Esperando {sleep_time} segundos antes de la próxima respuesta...")
                        time.sleep(sleep_time)
            
        except RateLimitExceeded as e:
            logger.warning(f"⚠️ Rate limit en monitoreo: {e}")
            self.handle_rate_limit(e)
            
        except Exception as e:
            logger.error(f"❌ Error en monitoreo de r/{subreddit_name}: {e}")
    
    def get_stats(self) -> dict:
        """
        Obtiene estadísticas del bot
        
        Returns:
            Diccionario con estadísticas
        """
        return {
            'total_responded': len(self.responded_ids),
            'templates_count': len(self.response_templates),
            'retry_count': self.retry_count,
            'storage_path': str(self.storage_path),
            'last_updated': datetime.now().isoformat()
        }
    
    def export_responded_ids(self, output_path: str = 'responded_ids_export.json') -> None:
        """
        Exporta los IDs respondidos a un archivo JSON
        
        Args:
            output_path: Ruta del archivo de exportación
        """
        try:
            data = {
                'responded_ids': list(self.responded_ids),
                'exported_at': datetime.now().isoformat(),
                'total': len(self.responded_ids)
            }
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"📤 IDs exportados a {output_path}")
        except IOError as e:
            logger.error(f"❌ Error al exportar IDs: {e}")


def main():
    """Función principal de ejemplo"""
    try:
        # Inicializar bot
        bot = RedditBot(
            env_path='.env',
            storage_path='responded_posts.json'
        )
        
        # Mostrar estadísticas
        stats = bot.get_stats()
        logger.info(f"📊 Estadísticas del bot: {stats}")
        
        # Ejemplo 1: Responder a un post específico
        # bot.reply_to_post('abc123', '¡Gracias por tu publicación!')
        
        # Ejemplo 2: Responder a un comentario específico
        # bot.reply_to_comment('xyz789')
        
        # Ejemplo 3: Monitorear un subreddit
        # bot.monitor_subreddit(
        #     subreddit_name='test',
        #     keywords=['python', 'programación', 'código'],
        #     limit=25
        # )
        
        # Ejemplo 4: Agregar plantilla personalizada
        # bot.add_response_template("¡Excelente punto! {comment}")
        
        logger.info("✅ Bot inicializado correctamente. Revisa reddit_bot.log para más detalles.")
        
    except ValueError as e:
        logger.error(f"❌ Error de configuración: {e}")
        logger.info("💡 Asegúrate de tener un archivo .env con CLIENT_ID, CLIENT_SECRET, REDDIT_USER, REDDIT_PASS")
    except Exception as e:
        logger.error(f"❌ Error fatal: {e}", exc_info=True)


if __name__ == '__main__':
    main()